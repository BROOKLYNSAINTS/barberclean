// src/services/manualInitializeAuth.js

/*import { getAuth } from 'firebase/auth';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Initializes Firebase Auth with React Native persistence if available.
 * Falls back to getAuth() if initializeAuth is not found.
 */
/*export const manualInitializeAuth = (app) => {
  try {
    if (typeof initializeAuth === 'function') {
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } else {
      console.warn('⚠️ initializeAuth not found. Falling back to getAuth().');
      return getAuth(app);
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Auth:', error);
    throw error;
  }
};*/
