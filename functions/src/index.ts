import { initializeApp } from 'firebase-admin/app';
import {
  FieldValue,
  getFirestore,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();

const businessTimeZone = 'Asia/Manila';

function getBusinessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: businessTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  const year = part('year');
  const month = part('month');
  const day = part('day');
  if (!year || !month || !day) {
    throw new Error(`Could not determine the current date in ${businessTimeZone}.`);
  }
  return `${year}-${month}-${day}`;
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export const expireMissedAppointments = onSchedule(
  {
    schedule: '5 0 * * *',
    timeZone: businessTimeZone,
    region: 'asia-southeast1',
  },
  async () => {
    const today = getBusinessDate();
    const db = getFirestore();
    let expiredCount = 0;
    let cursor: QueryDocumentSnapshot | undefined;
    while (true) {
      let query = db
        .collection('appointments')
        .where('status', 'in', ['pending', 'approved'])
        .where('date', '<', today)
        .orderBy('date')
        .limit(250);
      if (cursor) query = query.startAfter(cursor);

      const page = await query.get();
      if (page.empty) break;
      cursor = page.docs[page.docs.length - 1];

      for (const candidate of page.docs) {
        const candidateData = candidate.data();
        if (!isDateKey(candidateData.date)) {
          logger.warn('Skipping overdue appointment with invalid date.', {
            appointmentId: candidate.id,
          });
          continue;
        }
        if (candidateData.arrivedAt) continue;
        if (typeof candidateData.studentId !== 'string') {
          logger.warn('Skipping overdue appointment with invalid studentId.', {
            appointmentId: candidate.id,
          });
          continue;
        }

        const expired = await db.runTransaction(async (transaction) => {
          const appointment = await transaction.get(candidate.ref);
          if (!appointment.exists) return false;

          const data = appointment.data();
          if (!data) return false;
          if (
            (data.status !== 'pending' && data.status !== 'approved') ||
            !isDateKey(data.date) ||
            data.date >= today ||
            data.arrivedAt
          ) {
            return false;
          }
          if (typeof data.studentId !== 'string') {
            logger.warn('Skipping overdue appointment with invalid studentId.', {
              appointmentId: appointment.id,
            });
            return false;
          }

          const lockRef = db.collection('activeAppointmentLocks').doc(data.studentId);
          const lock = await transaction.get(lockRef);
          transaction.update(appointment.ref, {
            status: 'no-show',
            noShowAt: FieldValue.serverTimestamp(),
          });
          if (lock.exists && lock.data()?.appointmentId === appointment.id) {
            transaction.delete(lockRef);
          }
          return true;
        });

        if (expired) expiredCount += 1;
      }
    }

    logger.info('Finished expiring missed appointments.', { today, expiredCount });
  },
);
