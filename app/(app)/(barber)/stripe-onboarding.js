// app/(app)/(barber)/stripe-onboarding.js

import { useEffect } from "react";
import { View, ActivityIndicator, Alert, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";

import { auth } from "@/services/firebase";
import { getCustomerInfo } from "@/services/revenuecat";

export default function StripeOnboarding() {

  const { userId } = useLocalSearchParams();
  const router = useRouter();

  const ENTITLEMENT_ID =
    Platform.OS === "ios"
      ? "barber_clean_pro"
      : "barber-clean Pro";

  useEffect(() => {
    startOnboarding();
  }, []);

  const startOnboarding = async () => {

    try {

      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Error", "User not logged in");
        router.replace("/(auth)/login");
        return;
      }

      /**
       * 🔥 BLOCK STRIPE ONBOARDING
       * IF REVENUECAT SUBSCRIPTION IS NOT ACTIVE
       */
      const customerInfo = await getCustomerInfo();

      const isActive =
        customerInfo?.entitlements?.active[ENTITLEMENT_ID];

      if (!isActive) {

        Alert.alert(
          "Subscription Required",
          "You must activate your subscription before continuing."
        );

        router.replace("/(app)/(barber)/barber-subscription");

        return;
      }

      /**
       * 🔥 CONTINUE STRIPE ONBOARDING
       */
      const token = await user.getIdToken(true);

      const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

      if (!BASE_URL) {
        Alert.alert("Error", "Backend URL not configured");
        return;
      }

      const response = await fetch(
        `${BASE_URL}/api/create-stripe-onboarding-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-Backend-Base-Url": BASE_URL,
          },
          body: JSON.stringify({
            userId: userId || user.uid,
            returnUrl: `${BASE_URL}/api/connect-return`,
            refreshUrl: `${BASE_URL}/api/connect-return`,
            baseUrl: BASE_URL,
          }),
        }
      );

      const text = await response.text();

      console.log("STRIPE RESPONSE:", text);

      if (!response.ok) {
        throw new Error(text || "Failed to create onboarding link");
      }

      const data = JSON.parse(text);

      if (!data?.url) {
        throw new Error("Stripe onboarding URL missing");
      }

      await Linking.openURL(data.url);

    } catch (error) {

      console.log("Stripe onboarding error:", error);

      Alert.alert(
        "Onboarding Error",
        error.message || "Unable to start Stripe onboarding"
      );
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" />
    </View>
  );
}