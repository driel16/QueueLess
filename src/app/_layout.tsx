import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';

import { StudentQueueAlertModal } from '@/features/queueless/student-queue-alert-modal';
import { useStudentQueueAlerts } from '@/features/queueless/use-student-queue-alerts';

export default function RootLayout() {
  const { notifications, dismissNotification } = useStudentQueueAlerts();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (notifications.length) {
        dismissNotification();
        return true;
      }
      if (!router.canGoBack()) {
        return false;
      }

      router.back();
      return true;
    });

    return () => subscription.remove();
  }, [dismissNotification, notifications.length]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 250,
        }}
      />
      <StudentQueueAlertModal
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </>
  );
}
