import { doc, getDoc, setDoc } from 'firebase/firestore';

import { getFirebaseFirestore } from '@/lib/firebase';

import { defaultOperatingHours } from './schedule-utils';
import type { OperatingHours } from './schedule-utils';

export {
  createTimeSlots,
  defaultOperatingHours,
  formatTimeForDisplay,
  formatLocalDate,
  getCalendarDates,
  isOperatingDateAvailable,
  parseTimeFromDisplay,
  parseTimeToMinutes,
} from './schedule-utils';
export type { OperatingHours } from './schedule-utils';

function serviceAvailabilityRef(serviceId: string) {
  return doc(getFirebaseFirestore(), 'serviceAvailability', serviceId);
}

export async function getServiceAvailability(serviceIds: string[]) {
  const entries = await Promise.all(
    serviceIds.map(async (serviceId) => {
      try {
        const snapshot = await getDoc(serviceAvailabilityRef(serviceId));
        return [serviceId, snapshot.exists() ? snapshot.data().enabled === true : true] as const;
      } catch {
        return [serviceId, true] as const;
      }
    }),
  );

  return Object.fromEntries(entries) as Record<string, boolean>;
}

export async function setServiceAvailability(serviceId: string, enabled: boolean) {
  await setDoc(serviceAvailabilityRef(serviceId), { enabled });
}

export async function getOperatingHours(): Promise<OperatingHours> {
  try {
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
  } catch {
    return defaultOperatingHours;
  }
}

export async function saveOperatingHours(hours: OperatingHours) {
  await setDoc(doc(getFirebaseFirestore(), 'settings', 'operatingHours'), hours);
}
