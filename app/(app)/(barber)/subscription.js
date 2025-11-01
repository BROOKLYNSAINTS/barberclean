import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { CardField, useStripe } from "@/services/stripe";
import { Ionicons } from "@expo/vector-icons";
import { initializeStripe, createSubscription } from "@/services/stripe"; // Adjusted path
//import { getUserProfile, updateUserProfile, auth } from "@/services/firebase"; // Adjusted path
import { getUserProfile, updateUserProfile } from "@/services/firebase"; // Adjusted path
import { useRouter, useFocusEffect } from "expo-router";
import theme from "@/styles/theme"; // Adjusted path
import { ScreenContainer, ScreenHeader } from "@/components/LayoutComponents"; // Adjusted path
import { Button, Card } from "@/components/UIComponents"; // Adjusted path

// This screen seems to be a duplicate or an older version of subscription-payment.js
// It uses a similar structure but with CardField directly and a mock createSubscription.
// The subscription-payment.js uses the more modern PaymentSheet flow.
// For consistency and better UX, it might be better to deprecate this screen or align it
// with the PaymentSheet approach if it serves a different purpose.
// For now, I will convert its navigation and fix paths.

const BarberSubscriptionScreen = () => {
  const router = useRouter();
  const { createPaymentMethod } = useStripe(); // This is available if StripeProvider is an ancestor
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);

  const [cardComplete, setCardComplete] = useState(false);
  const [cardDetails, setCardDetails] = useState(null);

  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState("");

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
      if (userProfile.subscription) {
        setSubscriptionActive(userProfile.subscription.active || false);
        setSubscriptionEndDate(userProfile.subscription.endDate || "");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load subscription information. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // initializeStripe is called in stripe.js, so direct call here might be redundant
    // if StripeProvider is already set up globally or in a layout.
    // However, if it initializes specific settings, it can remain.
    async function setup() {
        try {
            await initializeStripe(); // From your stripe service
        } catch (e) {
            console.error("Stripe setup error in screen:", e);
            setError("Payment system could not be initialized.");
        }
    }
    setup();
  }, []);

  useFocusEffect(fetchProfileData); // Fetch data when screen comes into focus

  const handleCardChange = (details) => {
    setCardDetails(details);
    setCardComplete(details.complete);
  };

  const handleSubscribe = async () => {
    if (!cardComplete || !cardDetails) {
      Alert.alert("Incomplete Card", "Please ensure all card details are filled correctly.");
      return;
    }
    if (!profile) {
        Alert.alert("Error", "User profile not loaded. Cannot subscribe.");
        return;
    }

    setProcessing(true);
    setError("");
    try {
      const { paymentMethod, error: pmError } = await createPaymentMethod({
        type: "Card",
        card: cardDetails, // This should be the direct card details from CardField, not the component itself
        billingDetails: {
          name: profile.name,
          // email: profile.email, // if available
        },
      });

      if (pmError) {
        throw new Error(pmError.message || "Failed to create payment method.");
      }

      // Mock backend subscription creation
      const mockSubscription = await createSubscription("mock_customer_id", "price_barber_monthly", paymentMethod.id);

      const user = auth.currentUser;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      await updateUserProfile(user.uid, {
        subscription: {
          active: true,
          id: mockSubscription.id,
          endDate: endDate.toISOString(),
          paymentMethodId: paymentMethod.id,
          lastFour: cardDetails.last4, // Ensure cardDetails from onCardChange is used
          brand: cardDetails.brand,   // Ensure cardDetails from onCardChange is used
        },
      });

      await fetchProfileData(); // Refresh profile to show new status
      Alert.alert(
        "Subscription Activated!",
        "Your $30 monthly barber subscription is now active.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      console.error("Error processing subscription:", err);
      setError(err.message || "An unexpected error occurred during subscription.");
      Alert.alert("Subscription Failed", err.message || "Could not process your subscription.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel? This will remove your visibility to customers.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setProcessing(true);
            try {
              const user = auth.currentUser;
              // Mock backend cancellation
              console.log("Simulating cancellation for subscription:", profile?.subscription?.id);
              
              await updateUserProfile(user.uid, {
                subscription: {
                  ...(profile?.subscription || {}),
                  active: false,
                  cancelDate: new Date().toISOString(),
                },
              });
              await fetchProfileData();
              Alert.alert("Subscription Cancelled", "Your subscription has been successfully cancelled.");
            } catch (err) {
              console.error("Error cancelling subscription:", err);
              Alert.alert("Cancellation Failed", err.message || "Could not cancel your subscription.");
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
      return dateObj.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch (e) {
      return "Invalid Date";
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Subscription Management" leftAction={() => router.back()} />
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      </ScreenContainer>
    );
  }
  
  // Note: StripeProvider should wrap the part of your app that uses Stripe hooks.
  // If it's not already in a higher-level layout, it might be needed here or in the (app)/_layout.js
  // For now, assuming it is handled by a global provider or the other subscription screen which uses it.

  return (
    <ScreenContainer>
      <ScreenHeader title="Barber Subscription" leftAction={() => router.back()} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>Subscription Benefits</Text>
          {[
            "Appear in customer searches",
            "Manage your services and pricing",
            "Set your availability calendar",
            "Receive direct appointment bookings",
            "Access to barber bulletin board & network",
          ].map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.success} style={styles.benefitIcon} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </Card>

        {subscriptionActive ? (
          <Card style={styles.statusCard_active}>
            <View style={styles.statusHeader_active}>
              <Ionicons name="shield-checkmark" size={28} color={theme.colors.white} />
              <Text style={styles.statusHeaderText_active}>Active Subscription</Text>
            </View>
            <Text style={styles.statusSubText_active}>
              You are visible to customers and can receive bookings.
            </Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Renews On:</Text>
              <Text style={styles.detailValue}>{formatDate(subscriptionEndDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount:</Text>
              <Text style={styles.detailValue}>$30.00 / month</Text>
            </View>
            {profile?.subscription?.lastFour && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment:</Text>
                <Text style={styles.detailValue}>
                  {profile.subscription.brand || "Card"} ending in {profile.subscription.lastFour}
                </Text>
              </View>
            )}
            <Button
              title={processing ? "Processing..." : "Cancel Subscription"}
              onPress={handleCancelSubscription}
              disabled={processing}
              style={styles.cancelButton}
              textStyle={styles.cancelButtonText}
              icon={processing ? <ActivityIndicator size="small" color={theme.colors.white} /> : null}
            />
          </Card>
        ) : (
          <Card style={styles.subscribeCard}>
            <Text style={styles.cardTitle}>Subscribe to Unlock Features</Text>
            <Text style={styles.subscribeInfoText}>
              Join for $30/month to connect with clients and manage your business seamlessly.
            </Text>
            <Text style={styles.formLabel}>Payment Information</Text>
            <CardField
              postalCodeEnabled={true} // Recommended to keep true for better fraud prevention
              placeholder={{ number: "4242 4242 4242 4242" }}
              cardStyle={styles.cardInputStyle} // For the input field itself
              style={styles.cardFieldContainer} // For the container of CardField
              onCardChange={handleCardChange}
            />
            <Button
              title={processing ? "Processing..." : "Subscribe for $30/month"}
              onPress={handleSubscribe}
              disabled={!cardComplete || processing}
              style={[styles.subscribeButton, (!cardComplete || processing) && styles.disabledButton]}
              icon={processing ? <ActivityIndicator size="small" color={theme.colors.white} /> : <Ionicons name="sparkles-outline" size={20} color={theme.colors.white} />}
            />
            <Text style={styles.termsText}>
              By subscribing, you agree to our terms and a recurring $30 monthly charge. Cancel anytime.
            </Text>
          </Card>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.regular,
    paddingBottom: theme.spacing.large, 
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: theme.colors.danger,
    padding: theme.spacing.regular,
    textAlign: "center",
    fontSize: theme.typography.fontSize.medium,
  },
  infoCard: {
    marginBottom: theme.spacing.large,
    padding: theme.spacing.medium,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.large,
    fontWeight: "bold",
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.medium,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.small,
  },
  benefitIcon: {
    marginRight: theme.spacing.small,
  },
  benefitText: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  statusCard_active: {
    backgroundColor: theme.colors.successLight, // Light green background
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.large,
  },
  statusHeader_active: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.small,
    paddingHorizontal: theme.spacing.medium,
    borderRadius: theme.borderRadius.medium,
    alignSelf: "flex-start",
    marginBottom: theme.spacing.medium,
  },
  statusHeaderText_active: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.large -2,
    fontWeight: "bold",
    marginLeft: theme.spacing.small,
  },
  statusSubText_active: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.colors.successDark, // Darker green for text
    marginBottom: theme.spacing.medium,
    lineHeight: theme.typography.lineHeight.medium,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.successLighter, // Very light separator
  },
  detailLabel: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.colors.textPrimary,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: theme.colors.danger,
    marginTop: theme.spacing.medium,
  },
  cancelButtonText: {
    color: theme.colors.white, // Already handled by Button component
  },
  subscribeCard: {
    padding: theme.spacing.medium,
  },
  subscribeInfoText: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.large,
    textAlign: "center",
    lineHeight: theme.typography.lineHeight.medium,
  },
  formLabel: {
    fontSize: theme.typography.fontSize.medium,
    fontWeight: "500",
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.small,
  },
  cardFieldContainer: {
    width: "100%",
    height: 50,
    marginBottom: theme.spacing.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    justifyContent: "center",
  },
  cardInputStyle: { // Style for the CardField input itself
    backgroundColor: theme.colors.backgroundLight,
    textColor: theme.colors.textPrimary,
    fontSize: theme.typography.fontSize.medium,
    // borderRadius: theme.borderRadius.medium, // CardField might not support this directly
  },
  subscribeButton: {
    marginTop: theme.spacing.small,
  },
  disabledButton: {
    backgroundColor: theme.colors.disabled,
  },
  termsText: {
    fontSize: theme.typography.fontSize.small,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.medium,
    textAlign: "center",
    lineHeight: theme.typography.lineHeight.small,
  },
});

export default BarberSubscriptionScreen;

