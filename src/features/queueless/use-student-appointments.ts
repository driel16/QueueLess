import { useEffect, useState } from 'react';

import {
  subscribeToStudentAppointmentRequests,
  type AppointmentRequest,
} from './appointment-requests';

export function useStudentAppointments() {
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const unsubscribe = subscribeToStudentAppointmentRequests(
      (items) => {
        setRequests(items);
        setIsLoading(false);
        setError(undefined);
      },
      (loadError) => {
        setError(loadError.message);
        setIsLoading(false);
      },
    );
    return () => {
      unsubscribe();
    };
  }, []);

  const requestsWithLivePosition = requests.map((request) =>
    request.status === 'serving'
      ? { ...request, studentsAhead: 0, estimatedWaitMinutes: 0 }
      : request,
  );

  return { requests: requestsWithLivePosition, isLoading, error };
}
