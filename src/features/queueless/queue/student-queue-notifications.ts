import type { AppointmentRequest } from '../appointments/appointment-requests';

export type StudentQueueNotificationState = {
  status: AppointmentRequest['status'];
  date: string;
  nextAt?: Date | null;
};

export type StudentQueueNotification = {
  title: string;
  message: string;
};

export function getStudentQueueNotificationUpdates(
  previous: Map<string, StudentQueueNotificationState>,
  requests: AppointmentRequest[],
  today: string,
) {
  const current = new Map<string, StudentQueueNotificationState>();
  const updates: StudentQueueNotification[] = [];

  for (const request of requests) {
    const state: StudentQueueNotificationState = {
      status: request.status,
      date: request.date,
      nextAt: request.nextAt,
    };
    current.set(request.id, state);

    const before = previous.get(request.id);
    if (!before) continue;

    if (before.status === 'pending' && request.status === 'approved') {
      const isNext =
        request.date === today &&
        request.studentsAhead === 0;
      updates.push({
        title: isNext ? 'Appointment approved — you’re next!' : 'Appointment approved',
        message: isNext
          ? `${request.service} is approved for ${request.date}. You’re next in today’s queue.`
          : `${request.service} is approved for ${request.date}.`,
      });
    } else if (before.status === 'approved' && request.status === 'serving') {
      updates.push({
        title: 'You’re up!',
        message: `The cashier is ready to serve you for ${request.service}.`,
      });
    } else if (
      before.status === 'approved' &&
      request.status === 'approved' &&
      request.date === today &&
      request.nextAt &&
      (!before.nextAt || request.nextAt.getTime() !== before.nextAt.getTime())
    ) {
      updates.push({
        title: 'You’re next!',
        message: `${request.service} is next in line. Please stay near the cashier.`,
      });
    }
  }

  return { current, updates };
}
