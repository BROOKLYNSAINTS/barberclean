import { initializeApp, getApps } from 'firebase/app';
import Constants from 'expo-constants';

const EXTRA = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: EXTRA.FIREBASE_API_KEY,
  authDomain: EXTRA.FIREBASE_AUTH_DOMAIN,
  projectId: EXTRA.FIREBASE_PROJECT_ID,
  storageBucket: EXTRA.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: EXTRA.FIREBASE_MESSAGING_SENDER_ID,
  appId: EXTRA.FIREBASE_APP_ID,
  measurementId: EXTRA.FIREBASE_MEASUREMENT_ID,
};

try {
  if (getApps().length === 0) {
    initializeApp(firebaseConfig);
  }
} catch (error) {
  console.error('Firebase init error:', error);
}
