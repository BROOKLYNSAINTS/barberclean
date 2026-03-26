import { useEffect } from "react";
import { View, ActivityIndicator, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { auth } from "@/services/firebase";

export default function StripeOnboarding() {

  const router = useRouter();
  const { userId } = useLocalSearchParams();

  useEffect(() => {
    startOnboarding();
  }, []);

  const startOnboarding = async () => {

    try {

      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      const token = await user.getIdToken(true);

      const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

      const response = await fetch(
        `${BASE_URL}/api/create-stripe-onboarding-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`, // ✅ FIXED (string key)
          },
          body: JSON.stringify({
            userId: userId || user.uid,
            returnUrl: `${BASE_URL}/api/connect-return`,
            refreshUrl: `${BASE_URL}/api/connect-return`,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Stripe API error:", errorText);
        throw new Error("Failed to create onboarding link");
      }

      const data = await response.json();

      if (!data?.url) {
        throw new Error("Stripe onboarding URL missing");
      }

      await Linking.openURL(data.url);

    } catch (error) {

      console.log("Stripe onboarding error:", error);

      Alert.alert(
        "Onboarding Error",
        "Unable to start Stripe onboarding. Please try again."
      );
    }
  };

  return (
    <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}