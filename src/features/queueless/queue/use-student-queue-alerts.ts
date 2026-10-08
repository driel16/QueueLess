import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  subscribeToStudentAppointmentRequests,
  type AppointmentRequest,
} from '../appointments/appointment-requests';
import {
  getStudentQueueNotificationUpdates,
  type StudentQueueNotificationState,
} from './student-queue-notifications';
import { formatLocalDate } from '../schedule/schedule-utils';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase';

export type StudentQueueAlert = {
  id: number;
  title: string;
  message: string;
};

export function useStudentQueueAlerts() {
  const [notifications, setNotifications] = useState<StudentQueueAlert[]>([]);
  const notificationId = useRef(0);

  useEffect(() => {
    let isMounted = true;
    let generation = 0;
    let unsubscribeAppointments: (() => void) | undefined;
    let previous = new Map<string, StudentQueueNotificationState>();

    const unsubscribeAuth = onAuthStateChanged(getFirebaseAuth(), (user) => {
      generation += 1;
      const currentGeneration = generation;
      unsubscribeAppointments?.();
      unsubscribeAppointments = undefined;
      previous = new Map();
      setNotifications([]);

      if (!user) return;

      void getDoc(doc(getFirebaseFirestore(), 'users', user.uid))
        .then((profile) => {
          if (
            !isMounted ||
            currentGeneration !== generation ||
            profile.data()?.role !== 'student'
          ) {
            return;
          }

          unsubscribeAppointments = subscribeToStudentAppointmentRequests(
            (requests: AppointmentRequest[]) => {
              if (!isMounted || currentGeneration !== generation) return;

              const result = getStudentQueueNotificationUpdates(
                previous,
                requests,
                formatLocalDate(new Date()),
              );
              previous = result.current;
              if (result.updates.length) {
                const newNotifications = result.updates.map((notification) => ({
                  ...notification,
                  id: ++notificationId.current,
                }));
                setNotifications((current) => [...current, ...newNotifications]);
              }
            },
            (error) => {
              if (!isMounted || currentGeneration !== generation) return;

              const id = ++notificationId.current;
              setNotifications((current) => [
                ...current,
                {
                  id,
                  title: 'Notifications unavailable',
                  message: `Could not load live queue alerts: ${error.message}`,
                },
              ]);
            },
          );
        })
        .catch((error: unknown) => {
          if (!isMounted || currentGeneration !== generation) return;

          const id = ++notificationId.current;
          setNotifications((current) => [
            ...current,
            {
              id,
              title: 'Notifications unavailable',
              message:
                error instanceof Error
                  ? error.message
                  : 'Could not load your live queue alerts.',
            },
          ]);
        });
    });

    return () => {
      isMounted = false;
      generation += 1;
      unsubscribeAppointments?.();
      unsubscribeAuth();
    };
  }, []);

  const dismissNotification = useCallback(() => {
    setNotifications((current) => current.slice(1));
  }, []);

  return { notifications, dismissNotification };
}
