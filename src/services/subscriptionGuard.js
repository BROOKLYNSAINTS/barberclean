import { Platform } from "react-native";
import { getCustomerInfo } from "@/services/revenuecat";

export const checkSubscriptionAccess = async () => {
  try {

    const info = await getCustomerInfo();

    const ENTITLEMENT_ID =
      Platform.OS === "ios"
        ? "barber_clean_pro"
        : "barber-clean Pro";

    if (
      info?.entitlements?.active[ENTITLEMENT_ID]
    ) {
      return true;
    }

    return false;

  } catch (error) {

    console.log("Subscription check error:", error);
    return false;

  }
};