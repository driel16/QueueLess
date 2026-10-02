import { useEffect, useState } from 'react';

import {
  refreshQueueEstimates,
  reviewAppointmentRequest,
  subscribeToAppointmentRequests,
  type AppointmentRequest,
} from './appointment-requests';

export function useStaffAppointments() {
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    const repairingIds = new Set<string>();
    let previousQueueState = '';
    const unsubscribe = subscribeToAppointmentRequests(
      (items) => {
        setRequests(items);
        setIsLoading(false);
        setError(undefined);
        const queueState = items
          .filter(
            (item) =>
              item.status === 'approved' ||
              item.status === 'serving' ||
              item.status === 'skipped',
          )
          .map((item) => `${item.id}:${item.date}:${item.status}:${item.queueNumber ?? ''}`)
          .sort()
          .join('|');
        if (queueState !== previousQueueState) {
          previousQueueState = queueState;
          refreshQueueEstimates(items).catch((refreshError: unknown) => {
            if (isMounted) {
              previousQueueState = '';
              setError(
                refreshError instanceof Error
                  ? refreshError.message
                  : 'Could not refresh queue wait estimates.',
              );
            }
          });
        }
        items
          .filter(
            (item) =>
              item.status === 'approved' && typeof item.queueNumber !== 'number',
          )
          .forEach((item) => {
            if (repairingIds.has(item.id)) return;
            repairingIds.add(item.id);
            reviewAppointmentRequest(item.id, 'approved')
              .catch((repairError: unknown) => {
                if (isMounted) {
                  setError(
                    repairError instanceof Error
                      ? repairError.message
                      : `Could not assign a queue number for appointment ${item.id}.`,
                  );
                }
              })
              .finally(() => repairingIds.delete(item.id));
          });
      },
      (loadError) => {
        setError(loadError.message);
        setIsLoading(false);
      },
    );
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { requests, isLoading, error };
}
