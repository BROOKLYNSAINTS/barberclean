import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import theme from "@/styles/theme";

import { getOfferings, purchasePackage } from "@/services/revenuecat";

export default function BarberSubscriptionScreen() {

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [pkg, setPkg] = useState(null);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await getOfferings();

      if (offerings?.current?.availablePackages?.length > 0) {
        setPkg(offerings.current.availablePackages[0]);
      }

    } catch (error) {
      console.log("❌ Load offerings error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!pkg) return;

    const customerInfo = await purchasePackage(pkg);

    if (customerInfo) {
      console.log("✅ Subscription active");

      // Navigate after success
      router.replace("/(app)/(barber)/dashboard");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (

    <View style={styles.container}>

      <Text style={styles.title}>Barber Subscription</Text>

      <Text style={styles.price}>
        {pkg?.product?.priceString || "$50 / month"}
      </Text>

      <Text style={styles.description}>
        Unlock barber tools and start receiving appointments.
      </Text>

      <View style={styles.features}>
        <Text style={styles.feature}>• Accept appointments</Text>
        <Text style={styles.feature}>• AI receptionist</Text>
        <Text style={styles.feature}>• SMS reminders</Text>
        <Text style={styles.feature}>• Customer management</Text>
        <Text style={styles.feature}>• Booking analytics</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubscribe}
      >
        <Text style={styles.buttonText}>Subscribe Now</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#fff"
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10
  },

  price: {
    fontSize: 24,
    color: theme.colors.primary,
    textAlign: "center",
    marginBottom: 20
  },

  description: {
    textAlign: "center",
    marginBottom: 20
  },

  features: {
    marginBottom: 30
  },

  feature: {
    fontSize: 16,
    marginBottom: 8
  },

  button: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: "center"
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700"
  }

});