import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getUserProfile, updateUserProfile, auth } from "@/services/firebase"; // Adjusted path
import { StripeProvider, CardField, useStripe } from "@/services/stripe";
import { useRouter, useFocusEffect } from "expo-router";
import theme from "@/styles/theme"; // Adjusted path
import { ScreenContainer, ScreenHeader } from "@/components/LayoutComponents"; // Adjusted path
import { Button, Card } from "@/components/UIComponents"; // Adjusted path

const SubscriptionPaymentScreen = () => {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet, confirmPaymentSheetPayment } = useStripe(); // Using full PaymentSheet flow
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [cardBrand, setCardBrand] = useState("");

  // --- Mock backend calls --- 
  // In a real app, these would be API calls to your server
  const fetchPaymentSheetParams = async () => {
    // Simulate fetching client secret and ephemeral key from your backend
    // This is where you would call your server to create a PaymentIntent or SetupIntent
    // For demo, we'll use placeholder values. Replace with your actual backend integration.
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    return {
      paymentIntentClientSecret: "pi_example_secret_replace_with_real_one", // Replace with actual client secret from your server
      ephemeralKeySecret: "ek_example_secret_replace_with_real_one", // Replace with actual ephemeral key from your server
      customerId: profile?.stripeCustomerId || "cus_example_replace_with_real_one", // Replace with actual customer ID
      publishableKey: "pk_test_51O9XBtLkdIwK5uPVMOLt5PGqGZ5heXVRDgMY7KMTUZEABKQlQX6HGZCcHsMHHfQDONpLiHIJkQyXNeeNXUSDOUHX00oBRKNsAP",
    };
  };

  const subscribeUserOnBackend = async (paymentMethodId) => {
    // Simulate backend call to create subscription and save payment method
    console.log("Subscribing user on backend with PaymentMethod ID:", paymentMethodId);
    await new Promise(resolve => setTimeout(resolve, 1500));
    // This function would typically return subscription details
    return {
      success: true,
      subscriptionId: "sub_" + Math.random().toString(36).substr(2, 9),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
      // cardLast4 and cardBrand would ideally come from the paymentMethod object or your backend
    };
  };

  const cancelSubscriptionOnBackend = async () => {
    // Simulate backend call to cancel subscription
    console.log("Cancelling subscription on backend for user:", auth.currentUser?.uid);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  };
  // --- End Mock backend calls ---

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/(auth)/login");
        setLoading(false);
        return;
      }
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
      if (userProfile.paymentInfo) {
        setSubscriptionActive(userProfile.paymentInfo.subscriptionActive || false);
        setSubscriptionEndDate(userProfile.paymentInfo.subscriptionEndDate || "");
        setCardLast4(userProfile.paymentInfo.cardLast4 || "");
        setCardBrand(userProfile.paymentInfo.cardBrand || "");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load subscription information. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(fetchProfileData);

  const initializePaymentSheet = async () => {
    try {
        const { paymentIntentClientSecret, ephemeralKeySecret, customerId, publishableKey } = await fetchPaymentSheetParams();
        
        if (!paymentIntentClientSecret) {
            Alert.alert("Error", "Could not initialize payment. Missing payment intent.");
            return false;
        }

        const { error } = await initPaymentSheet({
            merchantDisplayName: "Barber App, Inc.",
            customerId: customerId,
            customerEphemeralKeySecret: ephemeralKeySecret,
            paymentIntentClientSecret: paymentIntentClientSecret,
            allowsDelayedPaymentMethods: true,
            returnURL: "barberapp://stripe-redirect", // Ensure this is configured in your app
            defaultBillingDetails: {
                name: profile?.name || "Valued Customer",
            }
        });
        if (error) {
            console.error("initPaymentSheet error:", error);
            Alert.alert(`Error: ${error.code}`, error.message);
            return false;
        }
        return true;
    } catch (e) {
        console.error("initializePaymentSheet exception:", e);
        Alert.alert("Payment Error", "Could not initialize payment sheet. Please try again.");
        return false;
    }
  };

  const handleSubscribe = async () => {
    setProcessing(true);
    setError("");

    const initialized = await initializePaymentSheet();
    if (!initialized) {
      setProcessing(false);
      return;
    }

    const { error: presentError } = await presentPaymentSheet();

    if (presentError) {
      if (presentError.code !== "Canceled") {
        Alert.alert(`Error: ${presentError.code}`, presentError.message);
      }
      setProcessing(false);
      return;
    }
    
    // If using Payment Intents, payment is often confirmed here or via webhook.
    // For subscriptions, you usually create a SetupIntent, get a PaymentMethod ID,
    // then create the subscription on your backend.
    // The example `fetchPaymentSheetParams` should ideally create a SetupIntent for subscriptions.
    // Let's assume for this demo `presentPaymentSheet` gives us what we need or a webhook handles it.

    try {
        // This is a simplified flow. In a real subscription scenario:
        // 1. Create a SetupIntent on your backend.
        // 2. Initialize PaymentSheet with the SetupIntent's client secret.
        // 3. After presentPaymentSheet, get the PaymentMethod ID from the SetupIntent (server-side or client-side if possible).
        // 4. Send this PaymentMethod ID to your backend to create the actual subscription with Stripe.
        
        // For this demo, we simulate success and backend interaction
        const backendResponse = await subscribeUserOnBackend("pm_mock_id_from_successful_setup");

        if (backendResponse.success) {
            const user = auth.currentUser;
            const paymentInfo = {
                subscriptionActive: true,
                subscriptionId: backendResponse.subscriptionId,
                subscriptionEndDate: backendResponse.endDate,
                // Ideally, get card details from the PaymentMethod object or your backend
                cardLast4: "****", // Placeholder, Stripe PaymentSheet handles card display
                cardBrand: "Card", // Placeholder
            };
            await updateUserProfile(user.uid, { paymentInfo }); // Ensure UID is passed
            await fetchProfileData();
            Alert.alert("Subscription Activated!", "Welcome! Your $30 monthly subscription is now active.",
                [{ text: "OK", onPress: () => router.back() }]
            );
        } else {
            throw new Error("Backend subscription failed.");
        }
    } catch (err) {
        console.error("Error processing subscription:", err);
        setError(err.message || "Failed to process subscription. Please try again.");
        Alert.alert("Subscription Error", err.message || "An unexpected error occurred.");
    } finally {
        setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel? You will lose access to premium features and will no longer appear in customer searches.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setProcessing(true);
            try {
              const backendResponse = await cancelSubscriptionOnBackend();
              if (backendResponse.success) {
                const user = auth.currentUser;
                const paymentInfo = {
                  ...profile.paymentInfo,
                  subscriptionActive: false,
                  subscriptionEndDate: new Date().toISOString(), // Mark cancellation date
                };
                await updateUserProfile(user.uid, { paymentInfo }); // Ensure UID is passed
                await fetchProfileData();
                Alert.alert("Subscription Cancelled", "Your subscription has been cancelled successfully.");
              } else {
                throw new Error("Backend cancellation failed.");
              }
            } catch (err) {
              console.error("Error cancelling subscription:", err);
              Alert.alert("Cancellation Error", err.message || "Failed to cancel subscription.");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string' || !dateString.includes('-')) return "N/A";
    try {
      // Parse as local date to avoid UTC shift bug
      const [year, month, day] = dateString.split('-').map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return "Invalid Date";
      const dateObj = new Date(year, month - 1, day);
      return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return "Invalid Date";
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Subscription" leftAction={() => router.back()} />
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      </ScreenContainer>
    );
  }

  return (
    <StripeProvider
      publishableKey="pk_test_51O9XBtLkdIwK5uPVMOLt5PGqGZ5heXVRDgMY7KMTUZEABKQlQX6HGZCcHsMHHfQDONpLiHIJkQyXNeeNXUSDOUHX00oBRKNsAP"
      // merchantIdentifier="merchant.com.barberapp" // Optional for iOS
    >
      <ScreenContainer>
        <ScreenHeader title="My Subscription" leftAction={() => router.back()} />
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          
          {error && <Text style={styles.errorText}>{error}</Text>}

          {subscriptionActive ? (
            <Card style={styles.card}>
              <View style={styles.statusContainer_active}>
                <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
                <Text style={styles.statusText_active}>Subscription Active</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Renews On:</Text>
                <Text style={styles.infoValue}>{formatDate(subscriptionEndDate)}</Text>
              </View>
              {cardLast4 && cardBrand && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Payment Method:</Text>
                  <Text style={styles.infoValue}>{cardBrand} ending in {cardLast4}</Text>
                </View>
              )}
              <Button 
                title="Cancel Subscription"
                onPress={handleCancelSubscription}
                disabled={processing}
                style={styles.cancelButton}
                textStyle={styles.cancelButtonText}
                icon={processing ? <ActivityIndicator size="small" color={theme.colors.white} /> : <Ionicons name="close-circle-outline" size={20} color={theme.colors.white} />}
              />
            </Card>
          ) : (
            <Card style={styles.card}>
              <View style={styles.statusContainer_inactive}>
                <Ionicons name="alert-circle" size={28} color={theme.colors.warning} />
                <Text style={styles.statusText_inactive}>Subscription Inactive</Text>
              </View>
              <Text style={styles.planDetailsTitle}>Unlock Premium Features</Text>
              <Text style={styles.planDetailsText}>
                Subscribe for $30/month to appear in customer searches, manage appointments seamlessly, and access all barber tools.
              </Text>
              {/* CardField is removed in favor of PaymentSheet */}
              <Button 
                title={processing ? "Processing..." : "Subscribe Now ($30/month)"}
                onPress={handleSubscribe}
                disabled={processing}
                style={styles.subscribeButton}
                icon={processing ? <ActivityIndicator size="small" color={theme.colors.white} /> : <Ionicons name="sparkles-outline" size={20} color={theme.colors.white} />}
              />
            </Card>
          )}
        </ScrollView>
      </ScreenContainer>
    </StripeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.regular,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: theme.colors.danger,
    textAlign: "center",
    marginBottom: theme.spacing.medium,
    fontSize: theme.typography.fontSize.medium,
  },
  card: {
    padding: theme.spacing.medium,
  },
  statusContainer_active: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.large,
    paddingVertical: theme.spacing.small,
    backgroundColor: theme.colors.successLight,
    paddingHorizontal: theme.spacing.medium,
    borderRadius: theme.borderRadius.medium,
  },
  statusText_active: {
    fontSize: theme.typography.fontSize.large, 
    fontWeight: "bold",
    color: theme.colors.success,
    marginLeft: theme.spacing.small,
  },
  statusContainer_inactive: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.medium,
    paddingVertical: theme.spacing.small,
    backgroundColor: theme.colors.warningLight,
    paddingHorizontal: theme.spacing.medium,
    borderRadius: theme.borderRadius.medium,
  },
  statusText_inactive: {
    fontSize: theme.typography.fontSize.large,
    fontWeight: "bold",
    color: theme.colors.warning,
    marginLeft: theme.spacing.small,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.small,
    paddingVertical: theme.spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.colors.textPrimary,
  },
  planDetailsTitle: {
    fontSize: theme.typography.fontSize.xlarge -2, // Slightly smaller than h1
    fontWeight: "bold",
    color: theme.colors.textPrimary,
    textAlign: "center",
    marginBottom: theme.spacing.small,
  },
  planDetailsText: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: theme.typography.lineHeight.medium,
    marginBottom: theme.spacing.large,
  },
  subscribeButton: {
    marginTop: theme.spacing.medium,
  },
  cancelButton: {
    marginTop: theme.spacing.large,
    backgroundColor: theme.colors.danger,
  },
  cancelButtonText: {
    color: theme.colors.white,
  },
});

export default SubscriptionPaymentScreen;

