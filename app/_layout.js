import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Linking, LogBox } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

import {
  auth,
  db,
  getUserProfile,
} from '@/services/firebase';

import {
  doc,
  getDoc,
} from 'firebase/firestore';

import {
  initRevenueCat,
  logoutRevenueCat,
} from '@/services/revenuecat';

import { onAuthStateChanged } from 'firebase/auth';

const publishableKey =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  Constants.expoConfig?.extra?.stripePublishableKey;

if (__DEV__) {
  LogBox.ignoreAllLogs();
}

export default function Layout() {
  const router = useRouter();

  /*
   * If Stripe returns while Firebase authentication is still
   * being restored, keep the URL here and process it once the
   * authenticated user becomes available.
   */
  const pendingStripeUrl = useRef(null);

  useEffect(() => {
    let authChangeNumber = 0;
    let isMounted = true;

    /*
     * Complete the Stripe Connect return flow.
     *
     * IMPORTANT:
     * The backend is responsible for verifying Stripe onboarding
     * and updating Firestore. The app does not mark onboarding
     * complete itself.
     */
    const processStripeReturn = async (url, user) => {
      if (!url || !url.includes('connect-return')) {
        return;
      }

      if (!user?.uid) {
        console.log(
          'Stripe Connect return waiting for Firebase authentication'
        );

        pendingStripeUrl.current = url;
        return;
      }

      try {
        console.log(
          'Verifying Stripe Connect onboarding state'
        );

        const userRef = doc(
          db,
          'users',
          user.uid
        );

        /*
         * Give the backend/Firestore write a short opportunity
         * to become visible to the app.
         */
        let onboardingComplete = false;

        for (let attempt = 0; attempt < 5; attempt += 1) {
          const snapshot = await getDoc(userRef);
          const data = snapshot.data();

          if (
            data?.stripeConnectOnboardingComplete === true
          ) {
            onboardingComplete = true;
            break;
          }

          await new Promise((resolve) =>
            setTimeout(resolve, 500)
          );
        }

        if (!isMounted) {
          return;
        }

        if (!onboardingComplete) {
          console.log(
            'Stripe onboarding has not been verified by the backend'
          );

          return;
        }

        pendingStripeUrl.current = null;

        console.log(
          'Stripe onboarding verified — opening barber dashboard'
        );

        router.replace(
          '/(app)/(barber)/dashboard'
        );
      } catch (error) {
        console.error(
          'Error processing Stripe Connect return:',
          error
        );
      }
    };

    /*
     * Initialize RevenueCat only for authenticated barber accounts.
     */
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        const currentAuthChange = ++authChangeNumber;

        console.log(
          'Firebase authentication changed:',
          user?.uid || 'signed out'
        );

        try {
          if (!user?.uid) {
            await logoutRevenueCat();

            console.log(
              'RevenueCat user signed out'
            );

            return;
          }

          const profile =
            await getUserProfile(user.uid);

          if (
            currentAuthChange !== authChangeNumber
          ) {
            return;
          }

          const isBarber =
            profile?.role === 'barber' ||
            profile?.userType === 'barber';

          if (!isBarber) {
            await logoutRevenueCat();

            console.log(
              'RevenueCat skipped because this account is not a barber'
            );

            return;
          }

          await initRevenueCat(user.uid);

          console.log(
            `RevenueCat synchronized with barber: ${user.uid}`
          );

          /*
           * Stripe may have returned before Firebase restored
           * the authenticated user. Process that pending return now.
           */
          if (pendingStripeUrl.current) {
            await processStripeReturn(
              pendingStripeUrl.current,
              user
            );
          }
        } catch (error) {
          console.log(
            'RevenueCat authentication synchronization failed:',
            error
          );
        }
      }
    );

    /*
     * Handle Stripe return while the app is already running.
     */
    const handleDeepLink = async (event) => {
      const url = event?.url;

      console.log(
        'Deep link received:',
        url
      );

      if (
        !url ||
        !url.includes('connect-return')
      ) {
        return;
      }

      await processStripeReturn(
        url,
        auth.currentUser
      );
    };

    const linkingSubscription =
      Linking.addEventListener(
        'url',
        handleDeepLink
      );

    /*
     * Handle Stripe return that launched the app.
     */
    const processInitialUrl = async () => {
      try {
        const initialUrl =
          await Linking.getInitialURL();

        if (initialUrl) {
          await handleDeepLink({
            url: initialUrl,
          });
        }
      } catch (error) {
        console.error(
          'Error processing initial deep link:',
          error
        );
      }
    };

    processInitialUrl();

    return () => {
      isMounted = false;
      authChangeNumber += 1;

      linkingSubscription.remove();
      unsubscribeAuth();
    };
  }, [router]);

  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier="merchant.com.barberapp"
      urlScheme="barberclean"
    >
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </StripeProvider>
  );
}