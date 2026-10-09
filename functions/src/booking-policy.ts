import { Timestamp } from 'firebase-admin/firestore';

export const bookingIncidentWindowMs = 30 * 24 * 60 * 60 * 1000;
export const bookingHoldDurationMs = 7 * 24 * 60 * 60 * 1000;
export const bookingIncidentThreshold = 3;

export function getBookingIncidentWindowStart(now: Timestamp) {
  return Timestamp.fromMillis(now.toMillis() - bookingIncidentWindowMs);
}

export function getBookingHoldUntil(latestIncidentAt: Timestamp) {
  return Timestamp.fromMillis(latestIncidentAt.toMillis() + bookingHoldDurationMs);
}

export function isBookingHoldOverridden(
  restriction: Record<string, unknown>,
  latestIncidentAt: Timestamp,
) {
  const overrideForIncidentAt = restriction.overrideForIncidentAt;
  return (
    overrideForIncidentAt instanceof Timestamp &&
    overrideForIncidentAt.isEqual(latestIncidentAt)
  );
}

export function formatBusinessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
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
    throw new Error('Could not determine the current business date.');
  }
  return `${year}-${month}-${day}`;
}

export function isValidBusinessDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getBusinessWeekday(date: string) {
  return new Date(`${date}T12:00:00+08:00`).getUTCDay();
}
