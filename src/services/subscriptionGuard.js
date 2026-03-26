import { getCustomerInfo } from "@/services/revenuecat";

export const checkSubscriptionAccess = async () => {
  try {

    const info = await getCustomerInfo();

    if (
      info?.entitlements?.active["barber-clean Pro"]
    ) {
      return true;
    }

    return false;

  } catch (error) {

    console.log("Subscription check error:", error);
    return false;

  }
};