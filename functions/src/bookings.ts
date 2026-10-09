import {
  FieldValue,
  type Firestore,
  getFirestore,
  Timestamp,
  type Transaction,
} from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  bookingIncidentThreshold,
  formatBusinessDate,
  getBookingHoldUntil,
  getBookingIncidentWindowStart,
  getBusinessWeekday,
  isBookingHoldOverridden,
  isValidBusinessDate,
} from './booking-policy.js';

const region = 'asia-southeast1';
const services = [
  { id: 'tuition-payment', title: 'Tuition Payment' },
  { id: 'document-request', title: 'Document Request' },
  { id: 'id-processing', title: 'ID Processing' },
  { id: 'scholarship-inquiry', title: 'Scholarship Inquiry' },
  { id: 'general-transaction', title: 'General Transaction' },
];

type IncidentType = 'no-show';

function requireAuth(
  auth: { uid: string; token: Record<string, unknown> } | undefined,
) {
  if (!auth || auth.token.email_verified !== true) {
    throw new HttpsError('unauthenticated', 'Sign in with your verified student account.');
  }
  return auth.uid;
}

async function requireStudent(db: Firestore, userId: string) {
  const user = await db.collection('users').doc(userId).get();
  const data = user.data();
  if (data?.role !== 'student') {
    throw new HttpsError('permission-denied', 'Only student accounts can book appointments.');
  }
  if (typeof data.displayName !== 'string' || !data.displayName.trim()) {
    throw new HttpsError('failed-precondition', 'Your account profile is incomplete. Contact the cashier.');
  }
  return data;
}

function formatHoldMessage(blockedUntil: Timestamp) {
  const formatted = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(blockedUntil.toDate());
  return `New bookings are paused until ${formatted} after repeated late cancellations or missed appointments. Contact the cashier if you need a review.`;
}

export async function recordBookingIncident(
  transaction: Transaction,
  db: Firestore,
  userId: string,
  studentName: string,
  appointmentId: string,
  type: IncidentType,
) {
  const now = Timestamp.now();
  const restrictionRef = db.collection('studentBookingRestrictions').doc(userId);
  const incidentCollection = restrictionRef.collection('incidents');
  const incidentQuery = incidentCollection.where(
    'occurredAt',
    '>=',
    getBookingIncidentWindowStart(now),
  );
  const [recentIncidents, restrictionSnapshot] = await Promise.all([
    transaction.get(incidentQuery),
    transaction.get(restrictionRef),
  ]);
  const incidentCount = recentIncidents.size + 1;
  const previousRestriction = restrictionSnapshot.data() ?? {};
  const blockedUntil =
    incidentCount >= bookingIncidentThreshold
      ? getBookingHoldUntil(now)
      : previousRestriction.blockedUntil;
  const incidentRef = incidentCollection.doc();

  transaction.create(incidentRef, {
    appointmentId,
    type,
    occurredAt: now,
  });
  transaction.set(
    restrictionRef,
    {
      studentId: userId,
      studentName,
      incidentCount,
      latestIncidentAt: now,
      ...(blockedUntil ? { blockedUntil } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function validateBookingDate(db: Firestore, date: string, service: string) {
  const today = formatBusinessDate();
  if (!isValidBusinessDate(date) || date < today) {
    throw new HttpsError('invalid-argument', 'Choose a valid appointment date today or later.');
  }

  const [hoursSnapshot, capacitySnapshot] = await Promise.all([
    db.collection('settings').doc('operatingHours').get(),
    db.collection('settings').doc('queueCapacity').get(),
  ]);
  const hours = hoursSnapshot.data() ?? {};
  const enabledWeekdays = Array.isArray(hours.enabledWeekdays)
    ? hours.enabledWeekdays
    : [1, 2, 3, 4, 5];
  const closedDates = Array.isArray(hours.closedDates) ? hours.closedDates : [];
  if (closedDates.includes(date) || !enabledWeekdays.includes(getBusinessWeekday(date))) {
    throw new HttpsError(
      'failed-precondition',
      'That date is not available for the cashier queue. Please choose an open date.',
    );
  }

  const serviceId = services.find((item) => item.title === service)?.id;
  if (!serviceId) {
    throw new HttpsError('invalid-argument', 'Choose a valid cashier service.');
  }
  const availability = await db.collection('serviceAvailability').doc(serviceId).get();
  if (availability.exists && availability.data()?.enabled === false) {
    throw new HttpsError(
      'failed-precondition',
      'That cashier service is not accepting appointments right now. Choose another service.',
    );
  }

  const dailyLimit = capacitySnapshot.data()?.dailyLimit;
  return typeof dailyLimit === 'number' && Number.isInteger(dailyLimit) && dailyLimit > 0
    ? dailyLimit
    : 100;
}

function readCallableString(value: unknown, name: string, maximumLength = 160) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > maximumLength ||
    value.includes('/')
  ) {
    throw new HttpsError('invalid-argument', `Enter a valid ${name}.`);
  }
  return value.trim();
}

export const createStudentAppointment = onCall({ region }, async (request) => {
  const userId = requireAuth(request.auth);
  const service = readCallableString(request.data?.service, 'service');
  if (!services.some((item) => item.title === service)) {
    throw new HttpsError('invalid-argument', 'Choose a valid cashier service.');
  }
  const date = request.data?.date;
  if (!isValidBusinessDate(date)) {
    throw new HttpsError('invalid-argument', 'Choose a valid appointment date.');
  }

  const db = getFirestore();
  const user = await requireStudent(db, userId);
  const dailyLimit = await validateBookingDate(db, date, service);
  const now = Timestamp.now();

  const requestRef = db.collection('appointments').doc();
  const lockRef = db.collection('activeAppointmentLocks').doc(userId);
  const capacityRef = db.collection('appointmentCapacity').doc(date);
  const existingRequests = db
    .collection('appointments')
    .where('studentId', '==', userId);

  await db.runTransaction(async (transaction) => {
    const [userSnapshot, lockSnapshot, capacitySnapshot, daySnapshot, requestSnapshot, restriction] =
      await Promise.all([
        transaction.get(db.collection('users').doc(userId)),
        transaction.get(lockRef),
        transaction.get(db.collection('settings').doc('queueCapacity')),
        transaction.get(capacityRef),
        transaction.get(existingRequests),
        transaction.get(db.collection('studentBookingRestrictions').doc(userId)),
      ]);
    if (!userSnapshot.exists || userSnapshot.data()?.role !== 'student') {
      throw new HttpsError('permission-denied', 'Only student accounts can book appointments.');
    }
    const restrictionData = restriction.data();
    const blockedUntil =
      restrictionData?.blockedUntil instanceof Timestamp ? restrictionData.blockedUntil : undefined;
    const latestIncidentAt =
      restrictionData?.latestIncidentAt instanceof Timestamp
        ? restrictionData.latestIncidentAt
        : undefined;
    if (
      blockedUntil &&
      latestIncidentAt &&
      blockedUntil.toMillis() > now.toMillis() &&
      !isBookingHoldOverridden(restrictionData ?? {}, latestIncidentAt)
    ) {
      throw new HttpsError('failed-precondition', formatHoldMessage(blockedUntil));
    }

    if (lockSnapshot.exists) {
      const previousAppointmentId = lockSnapshot.data()?.appointmentId;
      if (typeof previousAppointmentId !== 'string') {
        throw new HttpsError('failed-precondition', 'Your appointment lock is invalid. Contact the cashier.');
      }
      const previousAppointment = await transaction.get(
        db.collection('appointments').doc(previousAppointmentId),
      );
      const status = previousAppointment.data()?.status;
      if (['pending', 'approved', 'serving', 'skipped'].includes(status)) {
        throw new HttpsError(
          'failed-precondition',
          'You already have an active appointment. Cancel or complete it before booking another.',
        );
      }
    }
    if (requestSnapshot.docs.some((item) =>
      ['pending', 'approved', 'serving', 'skipped'].includes(item.data().status),
    )) {
      throw new HttpsError(
        'failed-precondition',
        'You already have an active appointment. Cancel or complete it before booking another.',
      );
    }

    const currentLimit = capacitySnapshot.data()?.dailyLimit;
    const limit =
      typeof currentLimit === 'number' && Number.isInteger(currentLimit) && currentLimit > 0
        ? currentLimit
        : dailyLimit;
    const bookedAppointments = daySnapshot.data()?.appointmentsBooked ?? 0;
    if (
      typeof bookedAppointments !== 'number' ||
      !Number.isInteger(bookedAppointments) ||
      bookedAppointments < 0 ||
      bookedAppointments >= limit
    ) {
      throw new HttpsError(
        'resource-exhausted',
        'The selected date is fully booked. Please choose another date.',
      );
    }

    transaction.create(requestRef, {
      studentId: userId,
      studentName: user.displayName,
      service,
      date,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(lockRef, {
      appointmentId: requestRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(
      capacityRef,
      {
        appointmentsBooked: bookedAppointments + 1,
        lastBookingId: requestRef.id,
        initialized: daySnapshot.data()?.initialized === true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  return { appointmentId: requestRef.id };
});

export const rescheduleStudentAppointment = onCall({ region }, async (request) => {
  const userId = requireAuth(request.auth);
  const requestId = readCallableString(request.data?.requestId, 'appointment ID');
  const newDate = request.data?.newDate;
  if (!isValidBusinessDate(newDate) || newDate <= formatBusinessDate()) {
    throw new HttpsError('invalid-argument', 'Choose a future date to reschedule your appointment.');
  }

  const db = getFirestore();
  const user = await requireStudent(db, userId);
  const now = Timestamp.now();

  const appointmentRef = db.collection('appointments').doc(requestId);
  const lockRef = db.collection('activeAppointmentLocks').doc(userId);
  const oldAppointmentSnapshot = await appointmentRef.get();
  if (!oldAppointmentSnapshot.exists) {
    throw new HttpsError('not-found', 'This appointment no longer exists.');
  }
  const oldAppointmentData = oldAppointmentSnapshot.data()!;
  if (
    oldAppointmentData.studentId !== userId ||
    !['pending', 'approved'].includes(oldAppointmentData.status) ||
    !isValidBusinessDate(oldAppointmentData.date) ||
    oldAppointmentData.date < formatBusinessDate() ||
    oldAppointmentData.arrivedAt
  ) {
    throw new HttpsError('failed-precondition', 'This appointment can no longer be rescheduled.');
  }
  if (oldAppointmentData.date === newDate) {
    throw new HttpsError('invalid-argument', 'Choose a different date to reschedule your appointment.');
  }
  const dailyLimit = await validateBookingDate(
    db,
    newDate,
    String(oldAppointmentData.service),
  );

  const replacementRef = db.collection('appointments').doc();
  const oldCapacityRef = db.collection('appointmentCapacity').doc(oldAppointmentData.date);
  const newCapacityRef = db.collection('appointmentCapacity').doc(newDate);
  await db.runTransaction(async (transaction) => {
    const [appointment, lock, oldCapacity, newCapacity, queueCapacity, restriction] =
      await Promise.all([
        transaction.get(appointmentRef),
        transaction.get(lockRef),
        transaction.get(oldCapacityRef),
        transaction.get(newCapacityRef),
        transaction.get(db.collection('settings').doc('queueCapacity')),
        transaction.get(db.collection('studentBookingRestrictions').doc(userId)),
      ]);
    if (!appointment.exists || appointment.data()?.studentId !== userId) {
      throw new HttpsError('not-found', 'This appointment no longer exists.');
    }
    const currentAppointment = appointment.data()!;
    if (
      !['pending', 'approved'].includes(currentAppointment.status) ||
      !isValidBusinessDate(currentAppointment.date) ||
      currentAppointment.date < formatBusinessDate() ||
      currentAppointment.arrivedAt
    ) {
      throw new HttpsError('failed-precondition', 'This appointment can no longer be rescheduled.');
    }
    if (lock.exists && lock.data()?.appointmentId !== requestId) {
      throw new HttpsError(
        'failed-precondition',
        'Another active appointment already exists. Complete or cancel it first.',
      );
    }

    const restrictionData = restriction.data();
    const blockedUntil =
      restrictionData?.blockedUntil instanceof Timestamp ? restrictionData.blockedUntil : undefined;
    const latestIncidentAt =
      restrictionData?.latestIncidentAt instanceof Timestamp
        ? restrictionData.latestIncidentAt
        : undefined;
    if (
      blockedUntil &&
      latestIncidentAt &&
      blockedUntil.toMillis() > now.toMillis() &&
      !isBookingHoldOverridden(restrictionData ?? {}, latestIncidentAt)
    ) {
      throw new HttpsError('failed-precondition', formatHoldMessage(blockedUntil));
    }

    const oldBooked = oldCapacity.data()?.appointmentsBooked;
    const newBooked = newCapacity.data()?.appointmentsBooked ?? 0;
    const configuredLimit = queueCapacity.data()?.dailyLimit;
    const limit =
      typeof configuredLimit === 'number' && Number.isInteger(configuredLimit) && configuredLimit > 0
        ? configuredLimit
        : dailyLimit;
    if (
      !oldCapacity.exists ||
      typeof oldBooked !== 'number' ||
      !Number.isInteger(oldBooked) ||
      oldBooked < 1
    ) {
      throw new HttpsError('failed-precondition', 'Could not release the old appointment capacity.');
    }
    if (
      typeof newBooked !== 'number' ||
      !Number.isInteger(newBooked) ||
      newBooked < 0 ||
      newBooked >= limit
    ) {
      throw new HttpsError('resource-exhausted', 'The selected date is fully booked. Please choose another date.');
    }

    transaction.update(appointmentRef, {
      status: 'cancelled',
      cancelledAt: FieldValue.serverTimestamp(),
      lateCancellation: false,
      cancellationReason: 'rescheduled',
    });
    transaction.create(replacementRef, {
      studentId: userId,
      studentName: user.displayName,
      service: currentAppointment.service,
      date: newDate,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(lockRef, {
      appointmentId: replacementRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(oldCapacityRef, {
      appointmentsBooked: oldBooked - 1,
      lastCancellationId: requestId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(
      newCapacityRef,
      {
        appointmentsBooked: newBooked + 1,
        lastBookingId: replacementRef.id,
        initialized: newCapacity.exists ? newCapacity.data()?.initialized === true : false,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  return { appointmentId: replacementRef.id };
});

export const overrideStudentBookingHold = onCall({ region }, async (request) => {
  const staffId = requireAuth(request.auth);
  const studentId = readCallableString(request.data?.studentId, 'student ID');
  const db = getFirestore();
  const staff = await db.collection('users').doc(staffId).get();
  if (!staff.exists || staff.data()?.role !== 'staff') {
    throw new HttpsError('permission-denied', 'Only verified staff can override a booking hold.');
  }

  const restrictionRef = db.collection('studentBookingRestrictions').doc(studentId);
  await db.runTransaction(async (transaction) => {
    const restriction = await transaction.get(restrictionRef);
    const data = restriction.data();
    const now = Timestamp.now();
    if (
      !data ||
      !(data.blockedUntil instanceof Timestamp) ||
      data.blockedUntil.toMillis() <= now.toMillis() ||
      !(data.latestIncidentAt instanceof Timestamp)
    ) {
      throw new HttpsError('failed-precondition', 'This student has no active booking hold.');
    }
    transaction.update(restrictionRef, {
      overrideForIncidentAt: data.latestIncidentAt,
      overriddenBy: staffId,
      overriddenAt: now,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { overridden: true };
});
