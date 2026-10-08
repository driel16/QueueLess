import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { lightPalette } from '@/features/queueless/palette';
import { StudentQueueAlertModal } from '@/features/queueless/queue/student-queue-alert-modal';
import { useStudentQueueAlerts } from '@/features/queueless/queue/use-student-queue-alerts';

export default function RootLayout() {
  const { notifications, dismissNotification } = useStudentQueueAlerts();
  const screenBackground = lightPalette.bg;
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let isActive = true;
    let receivedMotionChange = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      receivedMotionChange = true;
      setReduceMotion(enabled);
    });

    AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (isActive && !receivedMotionChange) setReduceMotion(enabled);
      },
      () => {
        if (isActive && !receivedMotionChange) setReduceMotion(true);
      },
    );

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: screenBackground },
          animation: reduceMotion ? 'none' : 'fade',
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
