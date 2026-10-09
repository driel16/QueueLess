import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

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
import {
  dismissStudentPushConsent,
  getStudentPushPermission,
  hasDismissedStudentPushConsent,
  registerStudentQueuePushNotifications,
  requestStudentQueuePushNotifications,
} from './push-notifications';

export type StudentQueueAlert = {
  id: number;
  title: string;
  message: string;
};

export function useStudentQueueAlerts() {
  const [notifications, setNotifications] = useState<StudentQueueAlert[]>([]);
  const [notificationConsent, setNotificationConsent] = useState<{
    userId: string;
    canAskAgain: boolean;
    error?: string;
  } | null>(null);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
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
      setNotificationConsent(null);

      if (!user) return;

      void getDoc(doc(getFirebaseFirestore(), 'users', user.uid))
        .then(async (profile) => {
          if (
            !isMounted ||
            currentGeneration !== generation ||
            profile.data()?.role !== 'student'
          ) {
            return;
          }

          if (Platform.OS !== 'web') {
            const permission = await getStudentPushPermission();
            if (!isMounted || currentGeneration !== generation) return;

            if (permission?.granted) {
              await registerStudentQueuePushNotifications(user.uid);
            } else if (
              permission &&
              !(await hasDismissedStudentPushConsent(user.uid)) &&
              isMounted &&
              currentGeneration === generation
            ) {
              setNotificationConsent({
                userId: user.uid,
                canAskAgain: permission.canAskAgain,
              });
            }
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
              if (result.updates.length && Platform.OS === 'web') {
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

  const enableNotifications = useCallback(async () => {
    if (!notificationConsent || isEnablingNotifications) return;

    setIsEnablingNotifications(true);
    setNotificationConsent((current) => (current ? { ...current, error: undefined } : current));
    try {
      const permission = await requestStudentQueuePushNotifications(notificationConsent.userId);
      if (permission?.granted) {
        setNotificationConsent(null);
      } else if (permission) {
        setNotificationConsent((current) =>
          current ? { ...current, canAskAgain: permission.canAskAgain } : current,
        );
      }
    } catch (error) {
      setNotificationConsent((current) =>
        current
          ? {
              ...current,
              error:
                error instanceof Error
                  ? error.message
                  : 'Could not enable queue notifications on this device.',
            }
          : current,
      );
    } finally {
      setIsEnablingNotifications(false);
    }
  }, [isEnablingNotifications, notificationConsent]);

  const openNotificationSettings = useCallback(async () => {
    if (!notificationConsent) return;
    try {
      await Linking.openSettings();
      await dismissStudentPushConsent(notificationConsent.userId);
      setNotificationConsent(null);
    } catch (error) {
      setNotificationConsent((current) =>
        current
          ? {
              ...current,
              error:
                error instanceof Error
                  ? error.message
                  : 'Could not open device settings. You can enable notifications in your device settings.',
            }
          : current,
      );
    }
  }, [notificationConsent]);

  const dismissNotificationConsent = useCallback(async () => {
    if (!notificationConsent) return;
    try {
      await dismissStudentPushConsent(notificationConsent.userId);
      setNotificationConsent(null);
    } catch (error) {
      setNotificationConsent((current) =>
        current
          ? {
              ...current,
              error:
                error instanceof Error
                  ? error.message
                  : 'Could not save your choice. Please try again.',
            }
          : current,
      );
    }
  }, [notificationConsent]);

  const dismissNotification = useCallback(() => {
    setNotifications((current) => current.slice(1));
  }, []);

  return {
    notifications,
    dismissNotification,
    notificationConsent,
    isEnablingNotifications,
    enableNotifications,
    openNotificationSettings,
    dismissNotificationConsent,
  };
}
