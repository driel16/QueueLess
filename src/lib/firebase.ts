import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export class FirebaseConfigurationError extends Error {
  constructor() {
    super(
      'Firebase is not configured. Add the Firebase web app values to your local .env file and restart Expo.',
    );
    this.name = 'FirebaseConfigurationError';
  }
}

function getFirebaseServices() {
  if (app && auth) {
    return { app, auth };
  }

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new FirebaseConfigurationError();
  }

  const appAlreadyExists = getApps().length > 0;
  const initializedApp = appAlreadyExists ? getApp() : initializeApp(firebaseConfig);
  const initializedAuth = appAlreadyExists
    ? FirebaseAuth.getAuth(initializedApp)
    : FirebaseAuth.initializeAuth(
        initializedApp,
        Platform.OS === 'web'
          ? { persistence: FirebaseAuth.browserLocalPersistence }
          // The Firebase JS SDK exposes this member only in its React Native runtime.
          // eslint-disable-next-line import/namespace
          : { persistence: FirebaseAuth.getReactNativePersistence(AsyncStorage) },
      );
  app = initializedApp;
  auth = initializedAuth;

  return { app: initializedApp, auth: initializedAuth };
}

export function getFirebaseAuth() {
  return getFirebaseServices().auth;
}

export function getFirebaseFirestore() {
  return getFirestore(getFirebaseServices().app);
}
