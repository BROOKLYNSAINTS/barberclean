import Purchases, {
  LOG_LEVEL,
} from "react-native-purchases";

import {
  Platform,
  Linking,
} from "react-native";

const IOS_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

const ANDROID_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

let isConfigured = false;
let currentRevenueCatUserId = null;


/**
 * Platform-specific entitlement identifier.
 */
export const ENTITLEMENT_ID =
  Platform.OS === "ios"
    ? "barber_clean_pro"
    : "barber-clean Pro";


/**
 * Return the appropriate RevenueCat API key.
 */
const getRevenueCatApiKey = () => {
  return Platform.OS === "ios"
    ? IOS_API_KEY
    : ANDROID_API_KEY;
};


/**
 * Initialize RevenueCat and identify the currently
 * authenticated Firebase user.
 */
export const initRevenueCat = async (userId) => {
  try {
    const API_KEY = getRevenueCatApiKey();

    if (!API_KEY) {
      throw new Error(
        `RevenueCat API key missing for ${Platform.OS}`
      );
    }

    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    /*
     * Configure the RevenueCat SDK only once.
     * User identification is handled separately below.
     */
    if (!isConfigured) {
      Purchases.configure({
        apiKey: API_KEY,
      });

      isConfigured = true;

      console.log(
        `✅ RevenueCat configured (${Platform.OS})`
      );
    }

    if (!userId) {
      console.log(
        "⚠️ RevenueCat initialized without a Firebase user ID"
      );

      return await Purchases.getCustomerInfo();
    }

    /*
     * If a different Firebase user signs in during the same
     * app session, sign out the previous RevenueCat identity.
     */
    if (
      currentRevenueCatUserId &&
      currentRevenueCatUserId !== userId
    ) {
      await Purchases.logOut();

      currentRevenueCatUserId = null;

      console.log(
        "✅ Previous RevenueCat user signed out"
      );
    }

    /*
     * Identify the current Firebase user in RevenueCat.
     */
    if (currentRevenueCatUserId !== userId) {
      const { customerInfo, created } =
        await Purchases.logIn(userId);

      currentRevenueCatUserId = userId;

      console.log(
        `✅ RevenueCat user identified: ${userId}`,
        { created }
      );

      return customerInfo;
    }

    /*
     * The correct user is already identified.
     */
    return await Purchases.getCustomerInfo();

  } catch (error) {
    console.log(
      "❌ RevenueCat initialization error:",
      error
    );

    throw error;
  }
};


/**
 * Sign out the current RevenueCat user.
 *
 * Call this when the Firebase user signs out.
 */
export const logoutRevenueCat = async () => {
  try {
    if (!isConfigured) {
      return;
    }

    if (currentRevenueCatUserId) {
      await Purchases.logOut();
    }

    currentRevenueCatUserId = null;

    console.log("✅ RevenueCat user signed out");

  } catch (error) {
    console.log(
      "❌ RevenueCat logout error:",
      error
    );

    throw error;
  }
};


/**
 * Listen for RevenueCat subscription updates.
 */
export const addSubscriptionListener = (callback) => {
  const listener = (customerInfo) => {
    const activeEntitlement =
      customerInfo?.entitlements?.active?.[
        ENTITLEMENT_ID
      ];

    callback(activeEntitlement || null);
  };

  Purchases.addCustomerInfoUpdateListener(listener);

  /*
   * Return a cleanup function for React useEffect.
   */
  return () => {
    Purchases.removeCustomerInfoUpdateListener(
      listener
    );
  };
};


/**
 * Get the current RevenueCat Offering.
 */
export const getOfferings = async () => {
  try {
    const offerings =
      await Purchases.getOfferings();

    if (!offerings?.current) {
      console.log(
        "⚠️ No current RevenueCat Offering available"
      );

      return null;
    }

    return offerings;

  } catch (error) {
    console.log(
      "❌ RevenueCat Offerings error:",
      error
    );

    throw error;
  }
};


/**
 * Purchase a RevenueCat subscription package.
 */
export const purchasePackage = async (pkg) => {
  if (!pkg) {
    throw new Error(
      "No RevenueCat subscription package was selected."
    );
  }

  try {
    const { customerInfo } =
      await Purchases.purchasePackage(pkg);

    const activeEntitlement =
      customerInfo?.entitlements?.active?.[
        ENTITLEMENT_ID
      ];

    console.log(
      "💳 RevenueCat purchase completed",
      {
        entitlementActive:
          Boolean(activeEntitlement),
      }
    );

    return customerInfo;

  } catch (error) {
    if (error?.userCancelled) {
      console.log(
        "RevenueCat purchase canceled by user"
      );

      return null;
    }

    console.log(
      "❌ RevenueCat purchase error:",
      error
    );

    throw error;
  }
};


/**
 * Get current RevenueCat customer information.
 */
export const getCustomerInfo = async () => {
  try {
    return await Purchases.getCustomerInfo();

  } catch (error) {
    console.log(
      "❌ RevenueCat customer information error:",
      error
    );

    throw error;
  }
};


/**
 * Restore Apple or Google purchases.
 */
export const restorePurchases = async () => {
  try {
    const customerInfo =
      await Purchases.restorePurchases();

    console.log(
      "🔄 RevenueCat purchases restored"
    );

    return customerInfo;

  } catch (error) {
    console.log(
      "❌ RevenueCat restore error:",
      error
    );

    throw error;
  }
};


/**
 * Open the device's subscription-management page.
 */
export const openManageSubscriptions = async () => {
  try {
    const subscriptionUrl =
      Platform.OS === "ios"
        ? "https://apps.apple.com/account/subscriptions"
        : "https://play.google.com/store/account/subscriptions";

    await Linking.openURL(subscriptionUrl);

  } catch (error) {
    console.log(
      "❌ Unable to open subscription manager:",
      error
    );

    throw error;
  }
};