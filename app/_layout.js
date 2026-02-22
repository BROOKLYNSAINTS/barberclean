import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

import { auth, db } from '@/services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const publishableKey =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  Constants.expoConfig?.extra?.stripePublishableKey;

export default function Layout() {
  const router = useRouter();

  useEffect(() => {
    const handleDeepLink = async (event) => {
      const url = event.url;
      console.log('🔗 Deep link received:', url);

      if (url && url.includes('connect-return')) {
        try {
          const user = auth.currentUser;
          if (user) {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              stripeConnectOnboardingComplete: true,
              updatedAt: serverTimestamp(),
            });
          }

          router.replace('/(app)/(barber)/dashboard');
        } catch (error) {
          console.error('❌ Error handling Connect return:', error);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier="merchant.com.barberapp"
      urlScheme="barberclean"
    >
      <Stack screenOptions={{ headerShown: false }} />
    </StripeProvider>
  );
}
