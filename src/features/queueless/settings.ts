import { doc, getDoc, setDoc } from 'firebase/firestore';

import { getFirebaseFirestore } from '@/lib/firebase';

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

function serviceAvailabilityRef(serviceId: string) {
  return doc(getFirebaseFirestore(), 'serviceAvailability', serviceId);
}

export async function getServiceAvailability(serviceIds: string[]) {
  const entries = await Promise.all(
    serviceIds.map(async (serviceId) => {
      const snapshot = await getDoc(serviceAvailabilityRef(serviceId));
      return [serviceId, snapshot.exists() ? snapshot.data().enabled === true : true] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<string, boolean>;
}

export async function setServiceAvailability(serviceId: string, enabled: boolean) {
  await setDoc(serviceAvailabilityRef(serviceId), { enabled });
}

export async function getOperatingHours(): Promise<OperatingHours> {
  const snapshot = await getDoc(doc(getFirebaseFirestore(), 'settings', 'operatingHours'));
  if (!snapshot.exists()) return defaultOperatingHours;

  const data = snapshot.data();
  return {
    enabledWeekdays: Array.isArray(data.enabledWeekdays)
      ? data.enabledWeekdays.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
      : defaultOperatingHours.enabledWeekdays,
    openTime: typeof data.openTime === 'string' ? data.openTime : defaultOperatingHours.openTime,
    closeTime: typeof data.closeTime === 'string' ? data.closeTime : defaultOperatingHours.closeTime,
    slotMinutes: data.slotMinutes === 15 || data.slotMinutes === 60 ? data.slotMinutes : 30,
    closedDates: Array.isArray(data.closedDates)
      ? data.closedDates.filter((date): date is string => typeof date === 'string')
      : [],
  };
}

export async function saveOperatingHours(hours: OperatingHours) {
  await setDoc(doc(getFirebaseFirestore(), 'settings', 'operatingHours'), hours);
}

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
