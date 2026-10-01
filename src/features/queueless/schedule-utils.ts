export type OperatingHours = {
  enabledWeekdays: number[];
  openTime: string;
  closeTime: string;
  slotMinutes: 15 | 30 | 60;
  closedDates: string[];
};

export const defaultOperatingHours: OperatingHours = {
  enabledWeekdays: [1, 2, 3, 4, 5],
  openTime: '08:00',
  closeTime: '17:00',
  slotMinutes: 30,
  closedDates: [],
};

export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCalendarDates(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

export function parseTimeToMinutes(time: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}

export function createTimeSlots(hours: OperatingHours, date?: string, now = new Date()) {
  const openAt = parseTimeToMinutes(hours.openTime);
  const closeAt = parseTimeToMinutes(hours.closeTime);
  if (
    openAt === undefined ||
    closeAt === undefined ||
    openAt >= closeAt ||
    !Number.isInteger(hours.slotMinutes) ||
    hours.slotMinutes <= 0
  ) {
    return [];
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const earliestSlot = date === formatLocalDate(now) ? currentMinutes + 1 : 0;
  const slots: string[] = [];
  for (let minute = openAt; minute + hours.slotMinutes <= closeAt; minute += hours.slotMinutes) {
    if (minute < earliestSlot) continue;
    const hour = String(Math.floor(minute / 60)).padStart(2, '0');
    const minutes = String(minute % 60).padStart(2, '0');
    slots.push(`${hour}:${minutes}`);
  }
  return slots;
}
