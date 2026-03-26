import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getUserProfile, auth } from "@/services/firebase";
import { useRouter, useFocusEffect } from "expo-router";
import theme from "@/styles/theme";
import { ScreenContainer, ScreenHeader } from "@/components/LayoutComponents";
import { Button, Card } from "@/components/UIComponents";

const SubscriptionPaymentScreen = () => {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [subscriptionActive, setSubscriptionActive] = useState(false);

  /**
   * 🔥 LOAD PROFILE (REVENUECAT VERSION)
   */
  const fetchProfileData = useCallback(async () => {
    setLoading(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      const userProfile = await getUserProfile(user.uid);

      setProfile(userProfile);

      // ✅ NEW: check RevenueCat-based subscription
      setSubscriptionActive(userProfile?.subscription?.status === "active");

    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }

  }, [router]);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData])
  );

  /**
   * 🔥 LOADING
   */
  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Subscription" leftAction={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  /**
   * 🔥 UI
   */
  return (
    <ScreenContainer>
      <ScreenHeader title="My Subscription" leftAction={() => router.back()} />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

        {subscriptionActive ? (

          <Card style={styles.card}>

            <View style={styles.statusContainer_active}>
              <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
              <Text style={styles.statusText_active}>Subscription Active</Text>
            </View>

            <Button
              title="Continue"
              onPress={() => router.replace("/(app)/(barber)/dashboard")}
              style={styles.subscribeButton}
            />

          </Card>

        ) : (

          <Card style={styles.card}>

            <View style={styles.statusContainer_inactive}>
              <Ionicons name="alert-circle" size={28} color={theme.colors.warning} />
              <Text style={styles.statusText_inactive}>Subscription Required</Text>
            </View>

            <Text style={styles.planDetailsText}>
              Subscribe to activate your barber account.
            </Text>

            <Button
              title="Go to Subscription"
              onPress={() => router.replace("/(app)/(barber)/barber-subscription")}
              style={styles.subscribeButton}
            />

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
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  planDetailsText: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.large,
  },
  subscribeButton: {
    marginTop: theme.spacing.medium,
  },
});

export default SubscriptionPaymentScreen;
