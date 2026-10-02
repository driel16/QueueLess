import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Modal, Pressable, Text, View } from 'react-native';

import {
  subscribeToStudentAppointmentRequests,
  type AppointmentRequest,
} from '@/features/queueless/appointment-requests';
import {
  getStudentQueueNotificationUpdates,
  type StudentQueueNotificationState,
} from '@/features/queueless/student-queue-notifications';
import { formatLocalDate } from '@/features/queueless/schedule-utils';
import { palette } from '@/features/queueless/palette';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase';

export default function RootLayout() {
  const [notifications, setNotifications] = useState<
    { id: number; title: string; message: string }[]
  >([]);
  const notificationId = useRef(0);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (notifications.length) {
        setNotifications((current) => current.slice(1));
        return true;
      }
      if (!router.canGoBack()) {
        return false;
      }

      router.back();
      return true;
    });

    return () => subscription.remove();
  }, [notifications.length]);

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
          if (!isMounted || currentGeneration !== generation || profile.data()?.role !== 'student') {
            return;
          }

          unsubscribeAppointments = subscribeToStudentAppointmentRequests(
            (requests: AppointmentRequest[]) => {
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
                setNotifications((current) => [
                  ...current,
                  ...newNotifications,
                ]);
              }
            },
            (error) => {
              if (isMounted && currentGeneration === generation) {
                const id = ++notificationId.current;
                setNotifications((current) => [
                  ...current,
                  {
                    id,
                    title: 'Notifications unavailable',
                    message: `Could not load live queue alerts: ${error.message}`,
                  },
                ]);
              }
            },
          );
        })
        .catch((error: unknown) => {
          if (isMounted && currentGeneration === generation) {
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
          }
        });
    });

    return () => {
      isMounted = false;
      generation += 1;
      unsubscribeAppointments?.();
      unsubscribeAuth();
    };
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
      <Modal
        animationType="fade"
        transparent
        visible={notifications.length > 0}
        onRequestClose={() => setNotifications((current) => current.slice(1))}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 24,
            backgroundColor: 'rgba(18, 33, 59, 0.48)',
          }}>
          <View
            accessibilityRole="alert"
            style={{
              gap: 12,
              borderRadius: 22,
              padding: 24,
              backgroundColor: palette.card,
            }}>
            <Text style={{ color: palette.ink, fontSize: 20, fontWeight: '900' }}>
              {notifications[0]?.title}
            </Text>
            <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 22 }}>
              {notifications[0]?.message}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={{
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 14,
                backgroundColor: palette.greenDark,
              }}
              onPress={() => setNotifications((current) => current.slice(1))}>
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900' }}>
                {notifications.length > 1 ? 'Next alert' : 'Got it'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
