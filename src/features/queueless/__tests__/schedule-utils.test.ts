import { describe, expect, it } from '@jest/globals';

import {
  createTimeSlots,
  formatLocalDate,
  getCalendarDates,
  parseTimeToMinutes,
} from '../schedule-utils';
import type { OperatingHours } from '../schedule-utils';

const officeHours: OperatingHours = {
  enabledWeekdays: [1, 2, 3, 4, 5],
  openTime: '08:00',
  closeTime: '09:30',
  slotMinutes: 30,
  closedDates: [],
};

describe('formatLocalDate', () => {
  it('formats local dates with zero-padded month and day', () => {
    expect(formatLocalDate(new Date(2024, 1, 9))).toBe('2024-02-09');
  });
});

describe('getCalendarDates', () => {
  it('returns a 42-day Sunday-first calendar containing every date in the month', () => {
    const dates = getCalendarDates(new Date(2024, 1, 15));

    expect(dates).toHaveLength(42);
    expect(dates[0]).toEqual(new Date(2024, 0, 28));
    expect(dates[0].getDay()).toBe(0);
    expect(dates.some((date) => date.getFullYear() === 2024 && date.getMonth() === 1 && date.getDate() === 29)).toBe(true);
  });
});

describe('parseTimeToMinutes', () => {
  it.each([
    ['00:00', 0],
    ['08:30', 510],
    ['23:59', 1439],
  ])('parses %s as %i minutes after midnight', (time, expected) => {
    expect(parseTimeToMinutes(time)).toBe(expected);
  });

  it.each(['8:00', '24:00', '12:60', 'not a time'])('rejects invalid time %s', (time) => {
    expect(parseTimeToMinutes(time)).toBeUndefined();
  });
});

describe('createTimeSlots', () => {
  it('creates slots that fit entirely within the opening hours', () => {
    expect(createTimeSlots(officeHours, '2024-05-13', new Date(2024, 4, 12, 12))).toEqual([
      '08:00',
      '08:30',
      '09:00',
    ]);
  });

  it('excludes elapsed same-day slots', () => {
    expect(createTimeSlots(officeHours, '2024-05-13', new Date(2024, 4, 13, 8, 0))).toEqual([
      '08:30',
      '09:00',
    ]);
  });

  it('returns no slots for invalid or reversed opening hours', () => {
    expect(createTimeSlots({ ...officeHours, openTime: '08:0' })).toEqual([]);
    expect(createTimeSlots({ ...officeHours, openTime: '09:00', closeTime: '09:00' })).toEqual([]);
    expect(createTimeSlots({ ...officeHours, openTime: '10:00', closeTime: '09:00' })).toEqual([]);
  });
});
