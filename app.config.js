import "dotenv/config";

const androidIntentUrl =
  'intent://dashboard?stripeConnectComplete=true#Intent;scheme=barber-clean;package=com.josephmurphy.barberclean;end';

export default {
  expo: {
    name: "barber-clean",
    slug: "barber-clean",
    version: "1.0.4",
    scheme: "barber-clean",
    orientation: "portrait",
    icon: "./assets/icon512.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
     extra: {
      eas: {
        projectId: "34c586b7-af2c-411d-9fbd-5cb699e2b12e"
      },
        firebase: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      },
      stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      stripeSubscriptionPriceId: process.env.EXPO_PUBLIC_STRIPE_SUBSCRIPTION_PRICE_ID,
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    
    },
    
    infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      },
    experiments: { tsconfigPaths: true },
    plugins: [
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "",
          enableGooglePay: true
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/icon512.png",
          color: "#ffffff",
          sounds: []
        }
      ],
      [
        "expo-calendar",
        {
          calendarPermission: "The app needs to access your calendar to schedule appointment reminders."
        }
      ]
    ],
    android: {
      package: "com.ScheduleSync.barber",
      versionCode: 28,
    },
    runtimeVersion: "1.0.4",
    updates: {
      enabled: false,
      checkAutomatically: "NEVER",
      fallbackToCacheTimeout: 0
    }
  },
};
