import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from "@/services/revenuecat";

import { auth, db } from "@/services/firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function BarberSubscriptionScreen() {

  const router = useRouter();

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {

      const offerings = await getOfferings();

      if (offerings?.current?.availablePackages?.length) {
        setPackages(offerings.current.availablePackages);
      } else {
        Alert.alert(
          "Subscriptions Unavailable",
          "Unable to load subscription options. Please try again later."
        );
      }

    } catch (error) {
      console.log("Offerings load error:", error);

      Alert.alert(
        "Error",
        "Failed to load subscription options."
      );
    }

    setLoading(false);
  };


  const handlePurchase = async (pkg) => {

    if (processing) return;

    try {

      setProcessing(true);

      const customerInfo = await purchasePackage(pkg);

      if (customerInfo?.entitlements?.active["barber-clean Pro"]) {

        const user = auth.currentUser;

        // ✅ SAVE TO FIRESTORE (CRITICAL FIX)
        await updateDoc(doc(db, "users", user.uid), {
          subscription: {
            status: "active",
            source: "revenuecat",
            updatedAt: new Date().toISOString(),
          },
        });

        Alert.alert(
          "Subscription Active",
          "Continue to complete onboarding."
        );

        router.replace({
          pathname: "/(app)/(barber)/stripe-onboarding",
          params: { userId: user.uid },
        });

      } else {
        Alert.alert(
          "Subscription Pending",
          "Subscription not yet active. Please try again."
        );
      }

    } catch (error) {

      console.log("Purchase failed:", error);

      Alert.alert(
        "Purchase Failed",
        "Unable to complete subscription."
      );

    } finally {
      setProcessing(false);
    }
  };


  const handleRestore = async () => {

    try {

      setProcessing(true);

      const info = await restorePurchases();

      if (info?.entitlements?.active["barber-clean Pro"]) {

        const user = auth.currentUser;

        // ✅ SAVE TO FIRESTORE (CRITICAL FIX)
        await updateDoc(doc(db, "users", user.uid), {
          subscription: {
            status: "active",
            source: "revenuecat",
            updatedAt: new Date().toISOString(),
          },
        });

        Alert.alert(
          "Subscription Restored",
          "Continue to complete onboarding."
        );

        router.replace({
          pathname: "/(app)/(barber)/stripe-onboarding",
          params: { userId: user.uid },
        });

      } else {

        Alert.alert(
          "No Active Subscription",
          "No active subscription was found for this account."
        );

      }

    } catch (error) {

      console.log("Restore failed:", error);

      Alert.alert(
        "Restore Failed",
        "Unable to restore purchases."
      );

    } finally {
      setProcessing(false);
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }


  return (

    <SafeAreaView style={styles.container}>

      <ScrollView contentContainerStyle={styles.content}>

        <Text style={styles.title}>Barber Subscription</Text>

        <Text style={styles.subtitle}>
          Subscribe to activate your barber account
        </Text>

        {packages.map((pkg) => (

          <TouchableOpacity
            key={pkg.identifier}
            style={styles.button}
            disabled={processing}
            onPress={() => handlePurchase(pkg)}
          >

            <Text style={styles.buttonText}>
              {pkg.product.title} — {pkg.product.priceString}
            </Text>

          </TouchableOpacity>

        ))}

        <TouchableOpacity
          style={styles.restore}
          onPress={handleRestore}
          disabled={processing}
        >
          <Text style={styles.restoreText}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

      </ScrollView>

    </SafeAreaView>

  );

}


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: "center",
  },

  button: {
    width: "100%",
    padding: 16,
    backgroundColor: "#000",
    borderRadius: 10,
    marginBottom: 15,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },

  restore: {
    marginTop: 20,
  },

  restoreText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },

});