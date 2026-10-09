import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { getFirebaseFirestore } from '@/lib/firebase';

const consentDismissedKey = (userId: string) =>
  `queueless:push-notification-consent-dismissed:${userId}`;

export type StudentPushPermission = Awaited<
  ReturnType<typeof Notifications.getPermissionsAsync>
>;

export function supportsStudentPushNotifications() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function getStudentPushPermission() {
  if (!supportsStudentPushNotifications()) return null;
  return Notifications.getPermissionsAsync();
}

export async function hasDismissedStudentPushConsent(userId: string) {
  return (await AsyncStorage.getItem(consentDismissedKey(userId))) === 'true';
}

export async function dismissStudentPushConsent(userId: string) {
  await AsyncStorage.setItem(consentDismissedKey(userId), 'true');
}

async function saveStudentPushToken(userId: string) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('queue-updates', {
      name: 'Queue updates',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1AB7A6',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error('Push notifications are not configured for this app build.');
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;
  await setDoc(
    doc(getFirebaseFirestore(), 'users', userId, 'pushTokens', encodeURIComponent(token)),
    {
      token,
      platform: Platform.OS,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function registerStudentQueuePushNotifications(userId: string) {
  const permission = await getStudentPushPermission();
  if (!permission?.granted) return;
  await saveStudentPushToken(userId);
}

export async function requestStudentQueuePushNotifications(userId: string) {
  const currentPermission = await getStudentPushPermission();
  if (!currentPermission) return null;

  const permission =
    currentPermission.granted || !currentPermission.canAskAgain
      ? currentPermission
      : await Notifications.requestPermissionsAsync();

  if (permission.granted) {
    await saveStudentPushToken(userId);
  }

  return permission;
}
