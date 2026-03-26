import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { auth } from "@/services/firebase";
import { finalizeBarberSubscription } from "@/services/finalizeBarberSubscription";

export default function StripeConnectReturn() {

  const router = useRouter();

  useEffect(() => {

    const activate = async () => {

      try {

        const user = auth.currentUser;

        if (!user) throw new Error("No user");

        console.log("🔥 FINALIZING BARBER:", user.uid);

        await finalizeBarberSubscription({
          userId: user.uid,
          customerEmail: user.email,
        });

      } catch (err) {
        console.log("Finalize error:", err);
      }

      router.replace("/(app)/(barber)/dashboard");

    };

    activate();

  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
