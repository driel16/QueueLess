import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';

import { getCurrentStudentProfile } from './auth';
import { getCallNextCandidates, getQueueEstimateOrder } from './queue-utils';
import { formatLocalDate, isOperatingDateAvailable } from './schedule-utils';
import { getOperatingHours } from './settings';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase';

export type AppointmentRequestStatus =
  | 'pending'
  | 'approved'
  | 'serving'
  | 'completed'
  | 'skipped'
  | 'rejected';

export type AppointmentRequest = {
  id: string;
  studentId: string;
  studentName: string;
  service: string;
  date: string;
  status: AppointmentRequestStatus;
  queueNumber?: number;
  studentsAhead?: number;
  estimatedWaitMinutes?: number;
  arrivedAt?: Date | null;
  nextAt?: Date | null;
  studentFinishedAt?: Date | null;
  cashierFinishedAt?: Date | null;
  createdAt?: Date | null;
  calledAt?: Date | null;
  completedAt?: Date | null;
};

export type QueueCapacity = { dailyLimit: number };
export const defaultQueueCapacity: QueueCapacity = { dailyLimit: 100 };

function toAppointmentRequest(id: string, data: Record<string, unknown>): AppointmentRequest {
  const toDate = (value: unknown) =>
    value && typeof value === 'object' && 'toDate' in value &&
    typeof value.toDate === 'function'
      ? value.toDate()
      : null;

  if (
    typeof data.studentId !== 'string' ||
    typeof data.studentName !== 'string' ||
    typeof data.service !== 'string' ||
    typeof data.date !== 'string' ||
    !(
      data.status === 'pending' ||
      data.status === 'approved' ||
      data.status === 'serving' ||
      data.status === 'completed' ||
      data.status === 'skipped' ||
      data.status === 'rejected'
    ) ||
    (data.queueNumber !== undefined && !Number.isInteger(data.queueNumber)) ||
    (data.studentsAhead !== undefined && !Number.isInteger(data.studentsAhead)) ||
    (data.estimatedWaitMinutes !== undefined &&
      (!Number.isInteger(data.estimatedWaitMinutes) || Number(data.estimatedWaitMinutes) < 0))
  ) {
    throw new Error(`Appointment request ${id} has invalid data.`);
  }

  return {
    id,
    studentId: data.studentId,
    studentName: data.studentName,
    service: data.service,
    date: data.date,
    status: data.status,
    ...(typeof data.queueNumber === 'number' ? { queueNumber: data.queueNumber } : {}),
    ...(typeof data.studentsAhead === 'number' ? { studentsAhead: data.studentsAhead } : {}),
    ...(typeof data.estimatedWaitMinutes === 'number'
      ? { estimatedWaitMinutes: data.estimatedWaitMinutes }
      : {}),
    createdAt: toDate(data.createdAt),
    calledAt: toDate(data.calledAt),
    completedAt: toDate(data.completedAt),
    arrivedAt: toDate(data.arrivedAt),
    nextAt: toDate(data.nextAt),
    studentFinishedAt: toDate(data.studentFinishedAt),
    cashierFinishedAt: toDate(data.cashierFinishedAt),
  };
}

export async function submitAppointmentRequest({
  service,
  date,
}: {
  service: string;
  date: string;
}) {
  const profile = await getCurrentStudentProfile();
  if (!profile || !profile.emailVerified) {
    throw new Error('Sign in with your verified student account before requesting an appointment.');
  }

  const operatingHours = await getOperatingHours();
  if (!isOperatingDateAvailable(date, operatingHours)) {
    throw new Error('That date is not available for the cashier queue. Please choose an open date.');
  }

  const db = getFirebaseFirestore();
  const requestRef = doc(collection(db, 'appointments'));
  const capacityDayRef = doc(db, 'appointmentCapacity', date);
  const capacityRef = doc(db, 'settings', 'queueCapacity');
  const request = {
    studentId: profile.uid,
    studentName: profile.displayName,
    service,
    date,
    status: 'pending',
    createdAt: serverTimestamp(),
  };

  await runTransaction(db, async (transaction) => {
    const [capacitySnapshot, daySnapshot] = await Promise.all([
      transaction.get(capacityRef),
      transaction.get(capacityDayRef),
    ]);
    const configuredLimit = capacitySnapshot.data()?.dailyLimit;
    const dailyLimit =
      typeof configuredLimit === 'number' && Number.isInteger(configuredLimit) && configuredLimit > 0
        ? configuredLimit
        : defaultQueueCapacity.dailyLimit;
    const bookedAppointments = daySnapshot.data()?.appointmentsBooked ?? 0;
    const isInitialized = daySnapshot.data()?.initialized === true;

    if (typeof bookedAppointments !== 'number' || bookedAppointments >= dailyLimit) {
      throw new Error('The selected date is fully booked. Please choose another date.');
    }

    transaction.set(requestRef, request);
    transaction.set(
      capacityDayRef,
      {
        appointmentsBooked: bookedAppointments + 1,
        lastBookingId: requestRef.id,
        initialized: isInitialized,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  return requestRef.id;
}

export function subscribeToAppointmentRequests(
  onRequests: (requests: AppointmentRequest[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const requestsQuery = query(collection(getFirebaseFirestore(), 'appointments'));
  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      try {
        const requests = snapshot.docs.map((item) =>
          toAppointmentRequest(item.id, item.data()),
        );
        requests.sort(
          (first, second) =>
            second.date.localeCompare(first.date) ||
            (second.queueNumber ?? 0) - (first.queueNumber ?? 0) ||
            (second.createdAt?.getTime() ?? 0) - (first.createdAt?.getTime() ?? 0),
        );
        onRequests(requests);
      } catch (error) {
        onError(error instanceof Error ? error : new Error('Could not read appointment requests.'));
      }
    },
    onError,
  );
}

export function subscribeToStudentAppointmentRequests(
  onRequests: (requests: AppointmentRequest[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    queueMicrotask(() => onError(new Error('Sign in to view your appointment requests.')));
    return () => {};
  }

  const requestsQuery = query(
    collection(getFirebaseFirestore(), 'appointments'),
    where('studentId', '==', user.uid),
  );
  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      try {
        const requests = snapshot.docs.map((item) =>
          toAppointmentRequest(item.id, item.data()),
        );
        requests.sort(
          (first, second) =>
            second.date.localeCompare(first.date) ||
            (second.queueNumber ?? 0) - (first.queueNumber ?? 0) ||
            (second.createdAt?.getTime() ?? 0) - (first.createdAt?.getTime() ?? 0),
        );
        onRequests(requests);
      } catch (error) {
        onError(error instanceof Error ? error : new Error('Could not read appointment requests.'));
      }
    },
    onError,
  );
}

export async function reviewAppointmentRequest(
  requestId: string,
  status: Extract<AppointmentRequestStatus, 'approved' | 'rejected'>,
) {
  const db = getFirebaseFirestore();
  const appointmentRef = doc(db, 'appointments', requestId);

  if (status === 'rejected') {
    await runTransaction(db, async (transaction) => {
      const appointment = await transaction.get(appointmentRef);
      if (!appointment.exists() || appointment.data().status !== 'pending') {
        throw new Error('This appointment has already been reviewed. Refresh and try again.');
      }
      const capacityDayRef = doc(db, 'appointmentCapacity', appointment.data().date);
      const capacityDay = await transaction.get(capacityDayRef);
      transaction.update(appointmentRef, { status });
      if (capacityDay.exists()) {
        transaction.update(capacityDayRef, {
          appointmentsBooked: Math.max(0, (capacityDay.data().appointmentsBooked ?? 1) - 1),
          updatedAt: serverTimestamp(),
        });
      }
    });
    return;
  }

  const { slotMinutes } = await getOperatingHours();
  const initialAppointment = await getDoc(appointmentRef);
  if (!initialAppointment.exists()) {
    throw new Error('This appointment no longer exists. Refresh and try again.');
  }
  const appointmentDate = initialAppointment.data().date;
  const appointmentSnapshot = await getDocs(
    query(
      collection(db, 'appointments'),
      where('date', '==', appointmentDate),
    ),
  );
  const approvedForDate = appointmentSnapshot.docs.filter(
    (item) =>
      item.id !== requestId &&
      (item.data().status === 'approved' || item.data().status === 'serving'),
  );
  await runTransaction(db, async (transaction) => {
    const appointment = await transaction.get(appointmentRef);
    if (!appointment.exists()) {
      throw new Error('This appointment has already been reviewed. Refresh and try again.');
    }
    if (
      appointment.data().status === 'approved' &&
      typeof appointment.data().queueNumber === 'number'
    ) {
      return;
    }
    if (
      appointment.data().status !== 'pending' &&
      appointment.data().status !== 'approved'
    ) {
      throw new Error('This appointment has already been reviewed. Refresh and try again.');
    }

    const appointmentData = appointment.data();
    const queueRef = doc(db, 'appointmentQueues', appointmentData.date);
    const queueSnapshot = await transaction.get(queueRef);
    const previousHighestNumber = approvedForDate.reduce((highest, item) => {
      const current = item.data().queueNumber;
      return typeof current === 'number' && Number.isInteger(current)
        ? Math.max(highest, current)
        : highest;
    }, approvedForDate.length);
    const lastQueueNumber = queueSnapshot.exists()
      ? queueSnapshot.data().lastQueueNumber
      : 0;
    const queueNumber = Math.max(
      previousHighestNumber,
      typeof lastQueueNumber === 'number' ? lastQueueNumber : 0,
    ) + 1;
    const studentsAhead = approvedForDate.filter((item) => {
      const otherQueueNumber = item.data().queueNumber;
      return typeof otherQueueNumber === 'number' && otherQueueNumber < queueNumber;
    }).length;

    transaction.update(appointmentRef, {
      status,
      queueNumber,
      studentsAhead,
      estimatedWaitMinutes: studentsAhead * slotMinutes,
    });
    transaction.set(
      queueRef,
      { lastQueueNumber: queueNumber, updatedAt: serverTimestamp() },
      { merge: true },
    );
  });
}

export async function callNextAppointment(date = formatLocalDate(new Date())) {
  const db = getFirebaseFirestore();
  const appointments = await getDocs(
    query(collection(db, 'appointments'), where('date', '==', date)),
  );
  const dateRequests = appointments.docs.map((item) =>
    toAppointmentRequest(item.id, item.data()),
  );
  const candidates = getCallNextCandidates(dateRequests);
  const next = candidates[0];
  if (!next) throw new Error('There are no approved appointments scheduled for today.');

  const queueRef = doc(db, 'appointmentQueues', date);
  const slotMinutes = (await getOperatingHours()).slotMinutes;
  await runTransaction(db, async (transaction) => {
    const appointmentRef = doc(db, 'appointments', next.id);
    const nextInLine = candidates[1];
    const nextInLineRef = nextInLine ? doc(db, 'appointments', nextInLine.id) : undefined;
    const staleNextRefs = dateRequests
      .filter(
        (item) =>
          item.status === 'approved' &&
          item.nextAt &&
          item.id !== next.id &&
          item.id !== nextInLine?.id,
      )
      .slice(0, 450)
      .map((item) => doc(db, 'appointments', item.id));
    const [appointment, queue, nextInLineSnapshot] = await Promise.all([
      transaction.get(appointmentRef),
      transaction.get(queueRef),
      nextInLineRef ? transaction.get(nextInLineRef) : Promise.resolve(undefined),
    ]);
    const staleSnapshots = await Promise.all(
      staleNextRefs.map((reference) => transaction.get(reference)),
    );
    if (!appointment.exists() || appointment.data().status !== 'approved') {
      throw new Error('The next appointment has changed. Refresh the queue and try again.');
    }
    if (!appointment.data().arrivedAt) {
      throw new Error('The next student has not checked in yet.');
    }
    if (queue.data()?.nowServingId) {
      throw new Error('Another appointment is already being served.');
    }
    if (
      nextInLineRef &&
      (!nextInLineSnapshot?.exists() ||
        nextInLineSnapshot.data().status !== 'approved' ||
        !nextInLineSnapshot.data().arrivedAt)
    ) {
      throw new Error('The queue order changed. Refresh and call the next student again.');
    }

    transaction.update(appointmentRef, {
      status: 'serving',
      calledAt: serverTimestamp(),
      ...(appointment.data().nextAt ? { nextAt: null } : {}),
    });
    transaction.set(
      queueRef,
      {
        nowServingId: appointmentRef.id,
        revision: (queue.data()?.revision ?? 0) + 1,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    staleSnapshots.forEach((snapshot) => {
      if (
        snapshot?.exists() &&
        snapshot.data().status === 'approved' &&
        snapshot.data().nextAt
      ) {
        transaction.update(snapshot.ref, { nextAt: null });
      }
    });
    if (nextInLine && nextInLineRef) {
      const hasNextMarker =
        nextInLineSnapshot?.exists() && Boolean(nextInLineSnapshot.data().nextAt);
      transaction.update(nextInLineRef, {
        ...(!hasNextMarker ? { nextAt: serverTimestamp() } : {}),
        studentsAhead: 1,
        estimatedWaitMinutes: slotMinutes,
      });
    }
  });
}

export async function refreshQueueEstimates(requests: AppointmentRequest[]) {
  const activeByDate = new Map<string, AppointmentRequest[]>();
  requests
    .filter((request) => request.status === 'approved' || request.status === 'serving')
    .forEach((request) => {
      const active = activeByDate.get(request.date) ?? [];
      active.push(request);
      activeByDate.set(request.date, active);
    });
  if (!activeByDate.size) return;

  const { slotMinutes } = await getOperatingHours();
  const db = getFirebaseFirestore();
  const updates = Array.from(activeByDate.values()).flatMap((active) => {
    const ordered = getQueueEstimateOrder(active);

    return ordered.flatMap((request, index) => {
      const studentsAhead = request.status === 'serving' ? 0 : index;
      const estimatedWaitMinutes = studentsAhead * slotMinutes;
      if (
        request.studentsAhead === studentsAhead &&
        request.estimatedWaitMinutes === estimatedWaitMinutes
      ) {
        return [];
      }
      return [{
        ref: doc(db, 'appointments', request.id),
        studentsAhead,
        estimatedWaitMinutes,
      }];
    });
  });

  for (let start = 0; start < updates.length; start += 450) {
    const batch = writeBatch(db);
    updates.slice(start, start + 450).forEach((update) => {
      batch.update(update.ref, {
        studentsAhead: update.studentsAhead,
        estimatedWaitMinutes: update.estimatedWaitMinutes,
      });
    });
    await batch.commit();
  }
}

export async function finishAppointment(requestId: string) {
  const db = getFirebaseFirestore();
  const appointmentRef = doc(db, 'appointments', requestId);
  await runTransaction(db, async (transaction) => {
    const appointment = await transaction.get(appointmentRef);
    if (!appointment.exists() || appointment.data().status !== 'serving') {
      throw new Error('This appointment is not currently being served.');
    }
    if (appointment.data().cashierFinishedAt) {
      throw new Error('The cashier has already confirmed this transaction.');
    }

    const finishedAt = serverTimestamp();
    if (appointment.data().studentFinishedAt) {
      const queueRef = doc(db, 'appointmentQueues', appointment.data().date);
      const queue = await transaction.get(queueRef);
      transaction.update(appointmentRef, {
        cashierFinishedAt: finishedAt,
        status: 'completed',
        completedAt: finishedAt,
      });
      transaction.set(
        queueRef,
        {
          nowServingId: null,
          servedCount: (queue.data()?.servedCount ?? 0) + 1,
          updatedAt: finishedAt,
        },
        { merge: true },
      );
    } else {
      transaction.update(appointmentRef, { cashierFinishedAt: finishedAt });
    }
  });
}

export async function confirmStudentTransactionFinished(requestId: string) {
  const db = getFirebaseFirestore();
  const appointmentRef = doc(db, 'appointments', requestId);
  await runTransaction(db, async (transaction) => {
    const appointment = await transaction.get(appointmentRef);
    if (!appointment.exists() || appointment.data().status !== 'serving') {
      throw new Error('This appointment is no longer being served.');
    }
    if (appointment.data().studentFinishedAt) {
      throw new Error('You have already confirmed this transaction.');
    }

    const finishedAt = serverTimestamp();
    if (appointment.data().cashierFinishedAt) {
      const queueRef = doc(db, 'appointmentQueues', appointment.data().date);
      transaction.update(appointmentRef, {
        studentFinishedAt: finishedAt,
        status: 'completed',
        completedAt: finishedAt,
      });
      transaction.update(queueRef, {
        nowServingId: null,
        servedCount: increment(1),
        updatedAt: finishedAt,
      });
    } else {
      transaction.update(appointmentRef, { studentFinishedAt: finishedAt });
    }
  });
}

export async function markAppointmentArrived(requestId: string) {
  const appointmentRef = doc(getFirebaseFirestore(), 'appointments', requestId);
  await runTransaction(getFirebaseFirestore(), async (transaction) => {
    const appointment = await transaction.get(appointmentRef);
    if (!appointment.exists() || appointment.data().status !== 'approved') {
      throw new Error('Only an approved appointment can be checked in.');
    }
    if (appointment.data().date !== formatLocalDate(new Date())) {
      throw new Error(
        `This appointment is scheduled for ${appointment.data().date}. Check-in is available on that date.`,
      );
    }
    if (appointment.data().arrivedAt) {
      throw new Error('This appointment has already been checked in.');
    }

    transaction.update(appointmentRef, { arrivedAt: serverTimestamp() });
  });
}

export async function skipServingAppointment(requestId: string) {
  const db = getFirebaseFirestore();
  const appointmentRef = doc(db, 'appointments', requestId);
  await runTransaction(db, async (transaction) => {
    const appointment = await transaction.get(appointmentRef);
    if (
      !appointment.exists() ||
      appointment.data().status !== 'serving' ||
      appointment.data().cashierFinishedAt ||
      appointment.data().studentFinishedAt
    ) {
      throw new Error('This appointment is not currently being served.');
    }

    const queueRef = doc(db, 'appointmentQueues', appointment.data().date);
    transaction.update(appointmentRef, { status: 'skipped', skippedAt: serverTimestamp() });
    transaction.set(
      queueRef,
      { nowServingId: null, updatedAt: serverTimestamp() },
      { merge: true },
    );
  });
}

export async function returnSkippedAppointmentToQueue(requestId: string) {
  const db = getFirebaseFirestore();
  const appointmentRef = doc(db, 'appointments', requestId);
  const initialAppointment = await getDoc(appointmentRef);
  if (!initialAppointment.exists() || initialAppointment.data().status !== 'skipped') {
    throw new Error('This appointment is not skipped.');
  }
  const queueRef = doc(db, 'appointmentQueues', initialAppointment.data().date);
  await runTransaction(db, async (transaction) => {
    const [appointment, queue] = await Promise.all([
      transaction.get(appointmentRef),
      transaction.get(queueRef),
    ]);
    if (!appointment.exists() || appointment.data().status !== 'skipped') {
      throw new Error('This appointment has changed. Refresh and try again.');
    }

    const queueNumber = (queue.data()?.lastQueueNumber ?? 0) + 1;
    transaction.update(appointmentRef, {
      status: 'approved',
      queueNumber,
      skippedAt: null,
    });
    transaction.set(
      queueRef,
      { lastQueueNumber: queueNumber, updatedAt: serverTimestamp() },
      { merge: true },
    );
  });
}

export async function getQueueCapacity(): Promise<QueueCapacity> {
  const snapshot = await getDoc(doc(getFirebaseFirestore(), 'settings', 'queueCapacity'));
  const dailyLimit = snapshot.data()?.dailyLimit;
  return {
    dailyLimit:
      typeof dailyLimit === 'number' && Number.isInteger(dailyLimit) && dailyLimit > 0
        ? dailyLimit
        : defaultQueueCapacity.dailyLimit,
  };
}

export async function saveQueueCapacity(capacity: QueueCapacity) {
  await setDoc(doc(getFirebaseFirestore(), 'settings', 'queueCapacity'), capacity);
}

export type StaffMember = { uid: string; name: string; email: string };

export function subscribeToStaffMembers(
  onMembers: (members: StaffMember[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(getFirebaseFirestore(), 'users'), where('role', '==', 'staff')),
    (snapshot) =>
      onMembers(
        snapshot.docs
          .map((item) => ({
            uid: item.id,
            name:
              typeof item.data().displayName === 'string'
                ? item.data().displayName
                : 'Staff member',
            email: typeof item.data().email === 'string' ? item.data().email : '',
          }))
          .sort((first, second) => first.name.localeCompare(second.name)),
      ),
    onError,
  );
}

export async function initializeAppointmentCapacity(requests: AppointmentRequest[]) {
  const db = getFirebaseFirestore();
  const bookedByDate = new Map<string, AppointmentRequest[]>();
  requests
    .filter((request) => request.status !== 'rejected')
    .forEach((request) => {
      const bookings = bookedByDate.get(request.date) ?? [];
      bookings.push(request);
      bookedByDate.set(request.date, bookings);
    });

  await Promise.all(
    Array.from(bookedByDate, async ([date, bookings]) => {
      const capacityRef = doc(db, 'appointmentCapacity', date);
      await runTransaction(db, async (transaction) => {
        const current = await transaction.get(capacityRef);
        if (current.data()?.initialized === true) {
          return;
        }

        const latestBooking = bookings
          .slice()
          .sort((first, second) => second.id.localeCompare(first.id))[0];
        transaction.set(
          capacityRef,
          {
            appointmentsBooked: bookings.length,
            lastBookingId: latestBooking?.id ?? '',
            initialized: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      });
    }),
  );
}
