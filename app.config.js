import "dotenv/config";
console.log("BUILD-TIME has OPENAI_API_KEY:", !!process.env.OPENAI_API_KEY);
console.log("BUILD-TIME OPENAI_API_KEY length:", (process.env.OPENAI_API_KEY || "").length);
const androidIntentUrl =
  'intent://dashboard?stripeConnectComplete=true#Intent;scheme=barberclean;package=com.ScheduleSync.barber.one;end';
export default {
  expo: {
    name: "barber-clean",
    slug: "barberclean",
    version: "1.0.4",
    scheme: "barberclean",
    orientation: "portrait",
    icon: "./assets/icon512.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    extra: {
      eas: {
        projectId: "83f06aa9-0a00-4fc3-8d84-e1ac8b51c5ef",
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
      // Use a private build-time env or server-side proxy for OpenAI keys.
      // Do NOT expose private keys via EXPO_PUBLIC_* variables which embed into the client.
      // Support a fallback secret name so we can create a new secret without deleting the old one.
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    },

    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    experiments: { tsconfigPaths: true },
    plugins: [
      "expo-router",
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "",
          enableGooglePay: true,
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/icon512.png",
          color: "#ffffff",
          sounds: [],
        },
      ],
      [
        "expo-calendar",
        {
          calendarPermission: "The app needs to access your calendar to schedule appointment reminders.",
        },
      ],

    ],

    android: {
      package: "com.ScheduleSync.barber.one",
      versionCode: 24,
      permissions: ["INTERNET", "READ_CALENDAR", "WRITE_CALENDAR"],
    },
    runtimeVersion: "1.0.5",
    updates: {
      enabled: false,
      checkAutomatically: "NEVER",
      fallbackToCacheTimeout: 0,
    },
  },
};
