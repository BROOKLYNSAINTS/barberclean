import "dotenv/config";

export default {
  expo: {
    name: "barber-clean",
    slug: "barberclean",
    version: "1.0.3",
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
        storageBucket:
          process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId:
          process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        measurementId:
          process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      },

      stripePublishableKey:
        process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,

      backendUrl:
        process.env.EXPO_PUBLIC_BACKEND_URL,
    },

    experiments: {
      tsconfigPaths: true,
    },

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
          calendarPermission:
            "The app needs to access your calendar to schedule appointment reminders.",
        },
      ],
    ],

    android: {
      package: "com.ScheduleSync.barber.one",

      permissions: [
        "INTERNET",
        "READ_CALENDAR",
        "WRITE_CALENDAR",
      ],
    },

    ios: {
      bundleIdentifier: "com.ScheduleSync.barber",
      buildNumber: "258",
      supportsTablet: false,

      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,

        NSPhotoLibraryUsageDescription:
          "ScheduleSync allows barbers to upload haircut style photos and profile images so customers can view services and book appointments.",

        NSCameraUsageDescription:
          "ScheduleSync allows barbers to take photos of haircut styles and upload profile images for their services.",

        NSMicrophoneUsageDescription:
          "ScheduleSync uses the microphone for voice interaction with the AI assistant to help customers book appointments.",

        NSCalendarsUsageDescription:
          "ScheduleSync adds booked barber appointments to your calendar so you receive reminders before your appointment.",

        NSRemindersUsageDescription:
          "ScheduleSync may create reminders to notify you before a scheduled barber appointment.",
      },
    },

    runtimeVersion: "1.0.5",

    updates: {
      enabled: false,
      checkAutomatically: "NEVER",
      fallbackToCacheTimeout: 0,
    },
  },
};