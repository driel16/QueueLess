import { describe, expect, it } from '@jest/globals';

import type { AppointmentRequest } from '../appointment-requests';
import { getStudentQueueNotificationUpdates } from '../student-queue-notifications';

function appointment(
  id: string,
  status: AppointmentRequest['status'],
  queueNumber: number,
): AppointmentRequest {
  return {
    id,
    studentId: `student-${id}`,
    studentName: `Student ${id}`,
    service: 'Tuition Payment',
    date: '2026-10-02',
    status,
    queueNumber,
  };
}

describe('student queue notifications', () => {
  it('announces approval and includes next status when appropriate', () => {
    const pending = { ...appointment('target', 'pending', 1), studentsAhead: 0 };
    const previous = getStudentQueueNotificationUpdates(new Map(), [pending], '2026-10-02');
    const approved = { ...appointment('target', 'approved', 1), studentsAhead: 0 };
    const result = getStudentQueueNotificationUpdates(
      previous.current,
      [approved],
      '2026-10-02',
    );

    expect(result.updates).toEqual([
      expect.objectContaining({ title: 'Appointment approved — you’re next!' }),
    ]);
  });

  it('announces when the student moves to the front of the queue', () => {
    const target = appointment('target', 'approved', 3);
    const previous = getStudentQueueNotificationUpdates(new Map(), [target], '2026-10-02');
    const next = { ...target, nextAt: new Date('2026-10-02T01:00:00.000Z') };
    const result = getStudentQueueNotificationUpdates(
      previous.current,
      [next],
      '2026-10-02',
    );

    expect(result.updates).toEqual([
      expect.objectContaining({ title: 'You’re next!' }),
    ]);
  });

  it('announces when the cashier starts serving the student', () => {
    const approved = appointment('target', 'approved', 1);
    const previous = getStudentQueueNotificationUpdates(new Map(), [approved], '2026-10-02');
    const serving = appointment('target', 'serving', 1);
    const result = getStudentQueueNotificationUpdates(
      previous.current,
      [serving],
      '2026-10-02',
    );

    expect(result.updates).toEqual([
      expect.objectContaining({ title: 'You’re up!' }),
    ]);
  });
});
