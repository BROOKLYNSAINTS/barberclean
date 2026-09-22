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
 * Platform-specific RevenueCat entitlement identifier.
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
 * Initialize RevenueCat using the authenticated
 * Firebase UID as the RevenueCat App User ID.
 *
 * IMPORTANT:
 * ScheduleSync uses the Firebase UID as the permanent
 * RevenueCat identity for each authenticated user.
 *
 * We do not intentionally create anonymous RevenueCat
 * customers during normal authenticated app use.
 */
export const initRevenueCat = async (userId) => {
  try {
    const API_KEY = getRevenueCatApiKey();

    if (!API_KEY) {
      throw new Error(
        `RevenueCat API key missing for ${Platform.OS}`
      );
    }

    if (!userId) {
      throw new Error(
        "Cannot initialize RevenueCat without a Firebase user ID."
      );
    }

    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    /*
     * First RevenueCat initialization for this app session.
     *
     * Supply the Firebase UID immediately so RevenueCat
     * uses it as the App User ID instead of intentionally
     * starting with a new anonymous customer.
     */
    if (!isConfigured) {
      Purchases.configure({
        apiKey: API_KEY,
        appUserID: userId,
      });

      isConfigured = true;
      currentRevenueCatUserId = userId;

      console.log(
        `✅ RevenueCat configured for Firebase user: ${userId}`
      );

      const customerInfo =
        await Purchases.getCustomerInfo();

      console.log(
        "🔎 RevenueCat configured customer",
        {
          firebaseUid: userId,
          originalAppUserId:
            customerInfo?.originalAppUserId,
          activeEntitlements:
            Object.keys(
              customerInfo?.entitlements?.active || {}
            ),
        }
      );

      return customerInfo;
    }

    /*
     * RevenueCat is already configured.
     *
     * If a different Firebase account signs in on this
     * device, switch directly to that Firebase UID.
     *
     * IMPORTANT:
     * Do NOT call Purchases.logOut() before logIn().
     * RevenueCat logOut() creates a new anonymous
     * RevenueCat App User ID.
     */
    if (currentRevenueCatUserId !== userId) {
      const {
        customerInfo,
        created,
      } = await Purchases.logIn(userId);

      currentRevenueCatUserId = userId;

      console.log(
        `✅ RevenueCat switched to Firebase user: ${userId}`,
        {
          created,
          originalAppUserId:
            customerInfo?.originalAppUserId,
          activeEntitlements:
            Object.keys(
              customerInfo?.entitlements?.active || {}
            ),
        }
      );

      return customerInfo;
    }

    /*
     * RevenueCat is already using the correct
     * Firebase UID.
     */
    const customerInfo =
      await Purchases.getCustomerInfo();

    console.log(
      "🔎 RevenueCat current customer",
      {
        firebaseUid: userId,
        originalAppUserId:
          customerInfo?.originalAppUserId,
        activeEntitlements:
          Object.keys(
            customerInfo?.entitlements?.active || {}
          ),
      }
    );

    return customerInfo;

  } catch (error) {
    console.log(
      "❌ RevenueCat initialization error:",
      error
    );

    throw error;
  }
};


/**
 * Clear local RevenueCat user tracking when the
 * Firebase user signs out.
 *
 * IMPORTANT:
 * We intentionally do NOT call Purchases.logOut().
 *
 * Calling RevenueCat logOut() creates another
 * anonymous RevenueCat App User ID.
 *
 * When another authenticated Firebase user signs in,
 * initRevenueCat() will switch RevenueCat directly
 * to that Firebase UID with Purchases.logIn().
 */
export const logoutRevenueCat = async () => {
  try {
    currentRevenueCatUserId = null;

    console.log(
      "✅ RevenueCat local user state cleared"
    );

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

    console.log(
      "🔔 RevenueCat entitlement update",
      {
        originalAppUserId:
          customerInfo?.originalAppUserId,
        entitlementId:
          ENTITLEMENT_ID,
        entitlementActive:
          Boolean(activeEntitlement),
      }
    );

    callback(activeEntitlement || null);
  };

  Purchases.addCustomerInfoUpdateListener(
    listener
  );

  /*
   * Cleanup function for React useEffect.
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

    console.log(
      "✅ RevenueCat offering loaded",
      {
        offeringIdentifier:
          offerings.current.identifier,
        availablePackages:
          offerings.current.availablePackages?.map(
            (pkg) => pkg.identifier
          ) || [],
      }
    );

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
    const {
      customerInfo,
    } = await Purchases.purchasePackage(pkg);

    const activeEntitlement =
      customerInfo?.entitlements?.active?.[
        ENTITLEMENT_ID
      ];

    console.log(
      "💳 RevenueCat purchase completed",
      {
        originalAppUserId:
          customerInfo?.originalAppUserId,
        entitlementId:
          ENTITLEMENT_ID,
        entitlementActive:
          Boolean(activeEntitlement),
        activeEntitlements:
          Object.keys(
            customerInfo?.entitlements?.active || {}
          ),
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
    const customerInfo =
      await Purchases.getCustomerInfo();

    console.log(
      "🔎 RevenueCat customer information",
      {
        originalAppUserId:
          customerInfo?.originalAppUserId,
        activeEntitlements:
          Object.keys(
            customerInfo?.entitlements?.active || {}
          ),
      }
    );

    return customerInfo;

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
 *
 * RevenueCat will attempt to associate the store
 * receipt with the currently identified Firebase
 * RevenueCat user according to the project's
 * configured transfer behavior.
 */
export const restorePurchases = async () => {
  try {
    const customerInfo =
      await Purchases.restorePurchases();

    const activeEntitlement =
      customerInfo?.entitlements?.active?.[
        ENTITLEMENT_ID
      ];

    console.log(
      "🔄 RevenueCat purchases restored",
      {
        originalAppUserId:
          customerInfo?.originalAppUserId,
        entitlementId:
          ENTITLEMENT_ID,
        entitlementActive:
          Boolean(activeEntitlement),
        activeEntitlements:
          Object.keys(
            customerInfo?.entitlements?.active || {}
          ),
      }
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

    await Linking.openURL(
      subscriptionUrl
    );

  } catch (error) {
    console.log(
      "❌ Unable to open subscription manager:",
      error
    );

    throw error;
  }
};