import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { Platform, Linking } from "react-native";

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

let isConfigured = false;


/**
 * Initialize RevenueCat
 */
export const initRevenueCat = async (userId) => {
  try {

    if (!API_KEY) {
      console.log("❌ RevenueCat API key missing");
      return;
    }

    if (isConfigured) {
      return;
    }

    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    await Purchases.configure({
      apiKey: API_KEY,
      appUserID: userId || null,
    });

    isConfigured = true;

    console.log("✅ RevenueCat initialized");

    // Test connection
    const offerings = await Purchases.getOfferings();
    console.log("📦 RevenueCat offerings:", offerings);

  } catch (error) {
    console.log("❌ RevenueCat init error:", error);
  }
};


/**
 * Listen for subscription updates
 * Useful if subscription changes while app is open
 */
export const addSubscriptionListener = (callback) => {

  Purchases.addCustomerInfoUpdateListener((customerInfo) => {

    const active =
      customerInfo?.entitlements?.active["barber-clean Pro"];

    callback(active);

  });

};


/**
 * Get RevenueCat offerings
 */
export const getOfferings = async () => {
  try {

    const offerings = await Purchases.getOfferings();

    if (!offerings || !offerings.current) {
      console.log("⚠️ No offerings available");
      return null;
    }

    return offerings;

  } catch (error) {

    console.log("❌ Offerings error:", error);
    return null;

  }
};


/**
 * Purchase subscription package
 */
export const purchasePackage = async (pkg) => {
  try {

    if (!pkg) {
      console.log("⚠️ No package selected");
      return null;
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg);

    console.log("💳 Purchase successful");

    return customerInfo;

  } catch (error) {

    if (error.userCancelled) {
      console.log("User cancelled purchase");
      return null;
    }

    console.log("❌ Purchase error:", error);
    return null;

  }
};


/**
 * Get current customer subscription info
 */
export const getCustomerInfo = async () => {
  try {

    const info = await Purchases.getCustomerInfo();
    return info;

  } catch (error) {

    console.log("❌ Customer info error:", error);
    return null;

  }
};


/**
 * Restore purchases
 */
export const restorePurchases = async () => {
  try {

    const info = await Purchases.restorePurchases();

    console.log("🔄 Purchases restored");

    return info;

  } catch (error) {

    console.log("❌ Restore error:", error);
    return null;

  }
};


/**
 * Open system subscription manager
 */
export const openManageSubscriptions = async () => {
  try {

    if (Platform.OS === "ios") {

      await Linking.openURL(
        "https://apps.apple.com/account/subscriptions"
      );

    } else {

      await Linking.openURL(
        "https://play.google.com/store/account/subscriptions"
      );

    }

  } catch (error) {

    console.log("❌ Open subscription manager failed:", error);

  }
};