import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initializeStripe } from '@/services/stripe';

export default function Layout() {
  useEffect(() => {
    (async () => {
      try {
        await initializeStripe();
      } catch (e) {
        console.error('Stripe init failed (app will still run):', e);
      }
    })();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}