import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';

import { StudentQueueAlertModal } from '@/features/queueless/student-queue-alert-modal';
import { useStudentQueueAlerts } from '@/features/queueless/use-student-queue-alerts';

export default function RootLayout() {
  const { notifications, dismissNotification } = useStudentQueueAlerts();
  const colorScheme = useColorScheme();
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
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
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
