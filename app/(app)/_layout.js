// 

// app/(app)/_layout.js
import React, { useEffect } from 'react';
import { Stack, Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/contexts/AuthContext';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function AppLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <Slot />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
