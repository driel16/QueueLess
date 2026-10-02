import { describe, expect, it } from '@jest/globals';

import type { AppointmentRequest } from '../appointment-requests';
import {
  getCallNextCandidates,
  getQueueEstimateOrder,
  isActiveAppointmentStatus,
} from '../queue-utils';

function request(
  id: string,
  status: AppointmentRequest['status'],
  queueNumber: number,
  arrivedAt: Date | null,
): AppointmentRequest {
  return {
    id,
    studentId: `student-${id}`,
    studentName: id,
    service: 'Tuition Payment',
    date: '2026-10-02',
    status,
    queueNumber,
    arrivedAt,
  };
}

describe('getCallNextCandidates', () => {
  it('only returns checked-in approved students in queue-number order', () => {
    const requests = [
      request('not-arrived', 'approved', 1, null),
      request('arrived-second', 'approved', 3, new Date()),
      request('serving', 'serving', 2, new Date()),
      request('arrived-first', 'approved', 2, new Date()),
    ];

    expect(getCallNextCandidates(requests).map(({ id }) => id)).toEqual([
      'arrived-first',
      'arrived-second',
    ]);
  });
});

describe('getQueueEstimateOrder', () => {
  it('keeps the serving appointment ahead of approved appointments', () => {
    const requests = [
      request('approved-first-ticket', 'approved', 1, new Date()),
      request('serving-later-ticket', 'serving', 3, new Date()),
      request('approved-last-ticket', 'approved', 4, new Date()),
    ];

    expect(getQueueEstimateOrder(requests).map(({ id }) => id)).toEqual([
      'serving-later-ticket',
      'approved-first-ticket',
      'approved-last-ticket',
    ]);
  });
});

describe('isActiveAppointmentStatus', () => {
  it.each(['pending', 'approved', 'serving', 'skipped'] as const)(
    'treats %s appointments as active',
    (status) => {
      expect(isActiveAppointmentStatus(status)).toBe(true);
    },
  );

  it.each(['completed', 'cancelled', 'rejected'] as const)(
    'treats %s appointments as inactive',
    (status) => {
      expect(isActiveAppointmentStatus(status)).toBe(false);
    },
  );
});
