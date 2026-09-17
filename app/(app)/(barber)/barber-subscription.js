import React, { useEffect, useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  Linking,
} from "react-native";

import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ENTITLEMENT_ID,
  getOfferings,
  purchasePackage,
  restorePurchases,
} from "@/services/revenuecat";

import { auth, db } from "@/services/firebase";

import {
  doc,
  updateDoc,
} from "firebase/firestore";

export default function BarberSubscriptionScreen() {
  const router = useRouter();

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  /**
   * Load the current RevenueCat Offering.
   */
  const loadOfferings = async () => {
    try {
      const offerings = await getOfferings();

      const availablePackages =
        offerings?.current?.availablePackages;

      if (availablePackages?.length) {
        setPackages(availablePackages);
      } else {
        Alert.alert(
          "Subscriptions Unavailable",
          "Unable to load subscription options. Please try again later."
        );
      }
    } catch (error) {
      console.log(
        "Offerings load error:",
        error
      );

      Alert.alert(
        "Error",
        "Failed to load subscription options."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Purchase the selected RevenueCat package.
   */
  const handlePurchase = async (pkg) => {
    if (processing) {
      return;
    }

    try {
      setProcessing(true);

      const customerInfo =
        await purchasePackage(pkg);

      /*
       * Only the correct platform-specific
       * Barber Pro entitlement can activate access.
       */
      const subscriptionActive = Boolean(
        customerInfo?.entitlements?.active?.[
          ENTITLEMENT_ID
        ]
      );

      if (!subscriptionActive) {
        Alert.alert(
          "Subscription Not Completed",
          "The Barber Pro subscription was not activated. Please try again."
        );

        return;
      }

      const user = auth.currentUser;

      if (!user?.uid) {
        throw new Error(
          "No authenticated user was found."
        );
      }

      await updateDoc(
        doc(db, "users", user.uid),
        {
          subscription: {
            status: "active",
            source: "revenuecat",
            updatedAt: new Date().toISOString(),
          },
        }
      );

      Alert.alert(
        "Subscription Active",
        "Your free trial has started. Continue to complete onboarding."
      );

      router.replace({
        pathname:
          "/(app)/(barber)/stripe-onboarding",
        params: {
          userId: user.uid,
        },
      });
    } catch (error) {
      console.log(
        "Purchase failed:",
        error
      );

      Alert.alert(
        "Purchase Failed",
        error?.message ||
          "Unable to complete the subscription."
      );
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Restore an existing Apple or Google subscription.
   */
  const handleRestore = async () => {
    if (processing) {
      return;
    }

    try {
      setProcessing(true);

      const customerInfo =
        await restorePurchases();

      /*
       * Only the correct platform-specific
       * Barber Pro entitlement can restore access.
       */
      const subscriptionActive = Boolean(
        customerInfo?.entitlements?.active?.[
          ENTITLEMENT_ID
        ]
      );

      if (!subscriptionActive) {
        Alert.alert(
          "No Active Subscription",
          "No active Barber Pro subscription was found for this account."
        );

        return;
      }

      const user = auth.currentUser;

      if (!user?.uid) {
        throw new Error(
          "No authenticated user was found."
        );
      }

      await updateDoc(
        doc(db, "users", user.uid),
        {
          subscription: {
            status: "active",
            source: "revenuecat",
            updatedAt: new Date().toISOString(),
          },
        }
      );

      Alert.alert(
        "Subscription Restored",
        "Your subscription was restored successfully."
      );

      router.replace({
        pathname:
          "/(app)/(barber)/stripe-onboarding",
        params: {
          userId: user.uid,
        },
      });
    } catch (error) {
      console.log(
        "Restore failed:",
        error
      );

      Alert.alert(
        "Restore Failed",
        error?.message ||
          "Unable to restore purchases."
      );
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Loading state.
   */
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#007AFF"
        />

        <Text style={styles.loadingText}>
          Loading subscription options...
        </Text>
      </SafeAreaView>
    );
  }

  const monthlyPrice =
    packages[0]?.product?.priceString ||
    "$49.99";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>
          ScheduleSync AI - Barber Pro
        </Text>

        <View style={styles.trialBanner}>
          <Text style={styles.trialTitle}>
            3 Months Free
          </Text>

          <Text style={styles.trialSubtitle}>
            Then {monthlyPrice} per month
          </Text>

          <Text style={styles.cancelText}>
            Cancel anytime before the trial ends to
            avoid being charged.
          </Text>
        </View>

        <Text style={styles.description}>
          Your Barber Pro subscription includes:
        </Text>

        <Text style={styles.feature}>
          {"\u2022"} AI receptionist for calls and SMS
        </Text>

        <Text style={styles.feature}>
          {"\u2022"} Appointment scheduling
        </Text>

        <Text style={styles.feature}>
          {"\u2022"} Customer notifications and reminders
        </Text>

        <Text style={styles.feature}>
          {"\u2022"} Calendar integration
        </Text>

        <Text style={styles.feature}>
          {"\u2022"} No-show protection tools
        </Text>

        <Text style={styles.feature}>
          {"\u2022"} Barber dashboard and analytics
        </Text>

        <Text style={styles.termsText}>
          Your first three months are free. After the
          free trial, {monthlyPrice} will be charged
          each month unless you cancel before the
          trial ends.
          {"\n\n"}
          Your subscription automatically renews
          monthly unless canceled at least 24 hours
          before the end of the current billing
          period.
          {"\n\n"}
          Payment will be charged through your App
          Store or Google Play account. You can
          manage or cancel the subscription through
          your device's subscription settings.
        </Text>

        <View style={styles.links}>
          <Text
            style={styles.linkText}
            onPress={() =>
              Linking.openURL(
                "https://www.wedotime.com/terms-and-conditions"
              )
            }
          >
            Terms of Use
          </Text>

          <Text
            style={styles.linkText}
            onPress={() =>
              Linking.openURL(
                "https://www.wedotime.com/privacy-policy"
              )
            }
          >
            Privacy Policy
          </Text>
        </View>

        {packages.map((pkg) => (
          <TouchableOpacity
            key={pkg.identifier}
            style={[
              styles.button,
              processing &&
                styles.buttonDisabled,
            ]}
            disabled={processing}
            onPress={() =>
              handlePurchase(pkg)
            }
          >
            <Text style={styles.buttonText}>
              {processing
                ? "Processing..."
                : "Start 3-Month Free Trial"}
            </Text>

            {!processing && (
              <Text style={styles.buttonPrice}>
                Then {pkg.product.priceString} per
                month
              </Text>
            )}
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
    padding: 24,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#555",
    fontSize: 15,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 18,
    textAlign: "center",
  },

  trialBanner: {
    backgroundColor: "#E8F5E9",
    borderColor: "#2E7D32",
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    marginBottom: 22,
    alignItems: "center",
  },

  trialTitle: {
    color: "#1B5E20",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },

  trialSubtitle: {
    color: "#1B5E20",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },

  cancelText: {
    color: "#355E3B",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 18,
  },

  description: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "600",
  },

  feature: {
    fontSize: 15,
    marginBottom: 6,
  },

  termsText: {
    fontSize: 13,
    marginTop: 18,
    marginBottom: 12,
    color: "#555",
    lineHeight: 19,
  },

  links: {
    marginTop: 5,
    marginBottom: 18,
    alignItems: "center",
  },

  linkText: {
    color: "#007AFF",
    marginBottom: 8,
    fontSize: 14,
  },

  button: {
    width: "100%",
    padding: 16,
    backgroundColor: "#000",
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#fff",
    fontSize: 17,
    textAlign: "center",
    fontWeight: "700",
  },

  buttonPrice: {
    color: "#D6D6D6",
    fontSize: 13,
    textAlign: "center",
    marginTop: 5,
  },

  restore: {
    marginTop: 10,
    marginBottom: 20,
  },

  restoreText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
    textAlign: "center",
  },
});