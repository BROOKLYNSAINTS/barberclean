// app/stripe-connect-return.js
import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function StripeConnectReturn() {
  const router = useRouter();
  const params = useLocalSearchParams(); // success, state, account, refresh, etc.

  useEffect(() => {
    console.log('Stripe Connect return params:', params);
    // You can check params.success / params.refresh here if you want

    // Go to the barber dashboard
    router.replace('/(app)/(barber)/dashboard');
  }, []);

  return null;
}
