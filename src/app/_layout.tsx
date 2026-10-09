import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { lightPalette } from '@/features/queueless/palette';
import { StudentQueueAlertModal } from '@/features/queueless/queue/student-queue-alert-modal';
import { StudentNotificationConsentModal } from '@/features/queueless/queue/student-notification-consent-modal';
import { useStudentQueueAlerts } from '@/features/queueless/queue/use-student-queue-alerts';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export default function RootLayout() {
  const {
    notifications,
    dismissNotification,
    notificationConsent,
    isEnablingNotifications,
    enableNotifications,
    openNotificationSettings,
    dismissNotificationConsent,
  } = useStudentQueueAlerts();
  const screenBackground = lightPalette.bg;
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/queue');
    });
    return () => subscription.remove();
  }, []);

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
      {Platform.OS === 'web' || notifications[0]?.title === 'Notifications unavailable' ? (
        <StudentQueueAlertModal notifications={notifications} onDismiss={dismissNotification} />
      ) : null}
      {Platform.OS !== 'web' && !notifications.length ? (
        <StudentNotificationConsentModal
          visible={notificationConsent !== null}
          canAskAgain={notificationConsent?.canAskAgain ?? true}
          isWorking={isEnablingNotifications}
          error={notificationConsent?.error}
          onEnable={enableNotifications}
          onOpenSettings={openNotificationSettings}
          onDismiss={dismissNotificationConsent}
        />
      ) : null}
    </>
  );
}
