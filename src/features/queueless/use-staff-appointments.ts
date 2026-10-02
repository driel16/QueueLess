import { useEffect, useState } from 'react';

import {
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
    const unsubscribe = subscribeToAppointmentRequests(
      (items) => {
        setRequests(items);
        setIsLoading(false);
        setError(undefined);
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
