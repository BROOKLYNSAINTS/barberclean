import "dotenv/config";

export default {
  expo: {
    name: "barber-clean",
    slug: "barber-clean",
    version: "1.0.1",
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
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL,
    
    },
    
    infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      },
    experiments: { tsconfigPaths: true },
    splash: {
      image: "./assets/icon512.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      bundleIdentifier: "com.ScheduleSync.barber",
      buildNumber: "184",
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSUserTrackingUsageDescription: "This app uses tracking to improve your experience.",
        NSCameraUsageDescription: "Camera is used for profile photos.",
        NSMicrophoneUsageDescription: "Microphone is used for voice and speech features.",
        NSSpeechRecognitionUsageDescription: "Speech recognition is used to convert your voice to text.",
        NSPhotoLibraryUsageDescription: "Photo library is used to pick profile or appointment photos.",
        NSCalendarsUsageDescription: "Calendar access is used to add appointments.",
        NSRemindersUsageDescription: "Reminders are used for appointment notifications."
      },
        },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icon512.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
    },
    runtimeVersion: { policy: "appVersion" },
    updates: {
      enabled: false,
      checkAutomatically: "NEVER",
      fallbackToCacheTimeout: 0
    }
  },
};
