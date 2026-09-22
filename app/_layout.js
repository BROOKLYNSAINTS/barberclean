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
     * The backend is responsible for verifying Stripe onboarding
     * and updating Firestore. The app only verifies that state
     * before navigating to the barber dashboard.
     */
    const processStripeReturn = async (url, user) => {
      if (!url || !url.includes('connect-return')) {
        return;
      }

      /*
       * Firebase may still be restoring authentication when
       * iOS sends the deep link to the app.
       */
      if (!user?.uid) {
        console.log(
          'Stripe Connect return waiting for Firebase authentication'
        );

        pendingStripeUrl.current = url;
        return;
      }

      /*
       * Keep the URL pending until Firestore confirms that
       * Stripe onboarding has completed.
       */
      pendingStripeUrl.current = url;

      try {
        console.log(
          'Verifying Stripe Connect onboarding state'
        );

        const userRef = doc(
          db,
          'users',
          user.uid
        );

        let onboardingComplete = false;

        /*
         * Give Firestore a short opportunity to reflect the
         * backend update before giving up.
         */
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const snapshot = await getDoc(userRef);
          const data = snapshot.data();

          console.log(
            `Stripe verification attempt ${attempt + 1}:`,
            data?.stripeConnectOnboardingComplete
          );

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

        /*
         * Firestore has confirmed onboarding.
         * Clear the pending URL and go directly to Dashboard.
         */
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
     * Watch Firebase authentication.
     *
     * IMPORTANT:
     * Stripe return processing happens BEFORE RevenueCat
     * initialization so a RevenueCat delay or error cannot
     * trap the barber on the Stripe onboarding spinner.
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

          /*
           * If Stripe returned while Firebase authentication
           * was being restored, finish the Stripe return NOW.
           *
           * Do not wait for RevenueCat.
           */
          if (pendingStripeUrl.current) {
            console.log(
              'Processing pending Stripe return after Firebase authentication'
            );

            await processStripeReturn(
              pendingStripeUrl.current,
              user
            );
          }

          /*
           * RevenueCat synchronization is independent of
           * Stripe Connect return navigation.
           */
          try {
            await initRevenueCat(user.uid);

            console.log(
              `RevenueCat synchronized with barber: ${user.uid}`
            );
          } catch (revenueCatError) {
            console.log(
              'RevenueCat initialization failed after authentication:',
              revenueCatError
            );
          }
        } catch (error) {
          console.log(
            'Authentication/profile synchronization failed:',
            error
          );
        }
      }
    );

    /*
     * Handle a Stripe deep link while the app is already running.
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
     * Handle a Stripe return that launches the app from a
     * closed/background state.
     */
    const processInitialUrl = async () => {
      try {
        const initialUrl =
          await Linking.getInitialURL();

        if (initialUrl) {
          console.log(
            'Initial deep link:',
            initialUrl
          );

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