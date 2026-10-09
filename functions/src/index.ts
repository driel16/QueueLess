import { initializeApp } from 'firebase-admin/app';
import {
  FieldValue,
  getFirestore,
  Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import {
  cancelStudentAppointment,
  createStudentAppointment,
  overrideStudentBookingHold,
  recordBookingIncident,
  rescheduleStudentAppointment,
} from './bookings.js';

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

function timestampMillis(value: unknown) {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return undefined;
}

function getQueuePushNotification(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  today: string,
) {
  if (before.status === 'pending' && after.status === 'approved') {
    const isNext = after.date === today && after.studentsAhead === 0;
    return {
      title: isNext ? 'Appointment approved — you’re next!' : 'Appointment approved',
      body: isNext
        ? `${String(after.service)} is approved for ${String(after.date)}. You’re next in today’s queue.`
        : `${String(after.service)} is approved for ${String(after.date)}.`,
    };
  }

  if (before.status === 'approved' && after.status === 'serving') {
    return {
      title: 'You’re up!',
      body: `The cashier is ready to serve you for ${String(after.service)}.`,
    };
  }

  const previousNextAt = timestampMillis(before.nextAt);
  const currentNextAt = timestampMillis(after.nextAt);
  if (
    before.status === 'approved' &&
    after.status === 'approved' &&
    after.date === today &&
    currentNextAt !== undefined &&
    previousNextAt !== currentNextAt
  ) {
    return {
      title: 'You’re next!',
      body: `${String(after.service)} is next in line. Please stay near the cashier.`,
    };
  }

  return undefined;
}

export const sendStudentQueuePushNotification = onDocumentUpdated(
  {
    document: 'appointments/{appointmentId}',
    region: 'asia-southeast1',
    retry: true,
  },
  async (event) => {
    const beforeSnapshot = event.data?.before;
    const afterSnapshot = event.data?.after;
    if (!beforeSnapshot?.exists || !afterSnapshot?.exists) return;

    const before = beforeSnapshot.data();
    const after = afterSnapshot.data();
    const notification = getQueuePushNotification(before, after, getBusinessDate());
    if (!notification) return;
    if (typeof after.studentId !== 'string' || !after.studentId) {
      logger.warn('Skipping queue notification for appointment without a student ID.', {
        appointmentId: event.params.appointmentId,
      });
      return;
    }

    const db = getFirestore();
    const tokenSnapshot = await db
      .collection('users')
      .doc(after.studentId)
      .collection('pushTokens')
      .get();
    if (tokenSnapshot.empty) {
      logger.info('No registered devices for student queue notification.', {
        appointmentId: event.params.appointmentId,
        studentId: after.studentId,
      });
      return;
    }

    const tokens = tokenSnapshot.docs.filter(
      (token) => typeof token.data().token === 'string',
    );
    for (let offset = 0; offset < tokens.length; offset += 100) {
      const batch = tokens.slice(offset, offset + 100);
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          batch.map((token) => ({
            to: token.data().token,
            sound: 'default',
            title: notification.title,
            body: notification.body,
            channelId: 'queue-updates',
            priority: 'high',
            data: { route: '/queue', appointmentId: event.params.appointmentId },
          })),
        ),
      });

      const result = (await response.json()) as {
        data?: {
          status?: string;
          message?: string;
          details?: { error?: string };
        }[];
      };
      if (!response.ok || !Array.isArray(result.data)) {
        throw new Error(`Expo Push API returned HTTP ${response.status}.`);
      }

      await Promise.all(
        result.data.map(async (ticket, index) => {
          if (ticket.status !== 'error') return;
          if (ticket.details?.error === 'DeviceNotRegistered') {
            await batch[index]?.ref.delete();
            return;
          }
          logger.warn('Expo Push API rejected a queue notification.', {
            appointmentId: event.params.appointmentId,
            message: ticket.message,
            error: ticket.details?.error,
          });
        }),
      );
    }
  },
);

export {
  cancelStudentAppointment,
  createStudentAppointment,
  overrideStudentBookingHold,
  rescheduleStudentAppointment,
};

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
          await recordBookingIncident(
            transaction,
            db,
            data.studentId,
            typeof data.studentName === 'string' ? data.studentName : 'Student',
            appointment.id,
            'no-show',
          );
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
