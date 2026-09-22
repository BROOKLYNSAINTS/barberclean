// app/(app)/(barber)/_layout.js

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import {
  Tabs,
  Redirect,
  useSegments,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged } from "firebase/auth";

import theme from "@/styles/theme";
import { auth } from "@/services/firebase";

import {
  ENTITLEMENT_ID,
  initRevenueCat,
  getCustomerInfo,
  addSubscriptionListener,
} from "@/services/revenuecat";

/*
 * These screens must remain accessible to barbers
 * who have not activated their subscription.
 */
const INACTIVE_BARBER_SCREENS = [
  "barber-subscription",
  "subscription-payment",
];

export default function BarberTabLayout() {
  const segments = useSegments();

  const currentScreen =
    segments[segments.length - 1];

  const [firebaseUser, setFirebaseUser] =
    useState(auth.currentUser);

  const [
    subscriptionActive,
    setSubscriptionActive,
  ] = useState(false);

  const [
    checkingSubscription,
    setCheckingSubscription,
  ] = useState(true);

  const [
    subscriptionError,
    setSubscriptionError,
  ] = useState("");

  /**
   * Check the currently authenticated barber's
   * RevenueCat entitlement.
   */
  const checkSubscriptionAccess =
    useCallback(async (user) => {
      if (!user?.uid) {
        console.log(
          "🔎 REVENUECAT ACCESS CHECK: no Firebase user"
        );

        setSubscriptionActive(false);
        setCheckingSubscription(false);
        return;
      }

      try {
        setCheckingSubscription(true);
        setSubscriptionError("");

        console.log(
          "🔎 REVENUECAT ACCESS CHECK START",
          {
            firebaseUid: user.uid,
            entitlementId: ENTITLEMENT_ID,
          }
        );

        /*
         * Initialize RevenueCat and identify it
         * with the Firebase UID.
         *
         * initRevenueCat() itself returns CustomerInfo,
         * but we perform one fresh getCustomerInfo()
         * below so the diagnostic output represents
         * the SDK's current state after identification.
         */
        await initRevenueCat(user.uid);

        const customerInfo =
          await getCustomerInfo();

        const activeEntitlements =
          Object.keys(
            customerInfo?.entitlements?.active ||
              {}
          );

        const allEntitlements =
          Object.keys(
            customerInfo?.entitlements?.all ||
              {}
          );

        const activeEntitlement =
          customerInfo?.entitlements?.active?.[
            ENTITLEMENT_ID
          ];

        const isActive =
          Boolean(activeEntitlement);

        console.log(
          "🔎 REVENUECAT ACCESS CHECK RESULT",
          {
            firebaseUid: user.uid,

            entitlementId:
              ENTITLEMENT_ID,

            revenueCatOriginalAppUserId:
              customerInfo?.originalAppUserId ||
              null,

            activeEntitlements,

            allEntitlements,

            subscriptionActive:
              isActive,

            activeEntitlementIdentifier:
              activeEntitlement?.identifier ||
              null,

            expirationDate:
              activeEntitlement?.expirationDate ||
              null,

            willRenew:
              activeEntitlement?.willRenew ??
              null,

            periodType:
              activeEntitlement?.periodType ||
              null,
          }
        );

        setSubscriptionActive(isActive);

      } catch (error) {
        console.log(
          "❌ Barber subscription check failed:",
          error
        );

        setSubscriptionActive(false);

        setSubscriptionError(
          "We could not verify your subscription. Please check your connection and try again."
        );
      } finally {
        setCheckingSubscription(false);
      }
    }, []);

  /**
   * Watch Firebase authentication and synchronize
   * the current user with RevenueCat.
   */
  useEffect(() => {
    let removeRevenueCatListener = null;

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        async (user) => {
          setFirebaseUser(user);

          console.log(
            "🔎 BARBER AUTH STATE",
            {
              authenticated:
                Boolean(user?.uid),

              firebaseUid:
                user?.uid || null,
            }
          );

          if (!user?.uid) {
            setSubscriptionActive(false);
            setCheckingSubscription(false);
            return;
          }

          await checkSubscriptionAccess(user);

          /*
           * Listen for purchases, restores,
           * renewals and entitlement changes.
           */
          if (!removeRevenueCatListener) {
            removeRevenueCatListener =
              addSubscriptionListener(
                (activeEntitlement) => {
                  const isActive =
                    Boolean(
                      activeEntitlement
                    );

                  console.log(
                    "🔎 REVENUECAT ENTITLEMENT UPDATE",
                    {
                      entitlementId:
                        ENTITLEMENT_ID,

                      subscriptionActive:
                        isActive,

                      identifier:
                        activeEntitlement
                          ?.identifier ||
                        null,

                      expirationDate:
                        activeEntitlement
                          ?.expirationDate ||
                        null,
                    }
                  );

                  setSubscriptionActive(
                    isActive
                  );

                  setSubscriptionError("");
                  setCheckingSubscription(
                    false
                  );
                }
              );
          }
        }
      );

    return () => {
      unsubscribeAuth();

      if (removeRevenueCatListener) {
        removeRevenueCatListener();
      }
    };
  }, [checkSubscriptionAccess]);

  /**
   * Show a loading screen while RevenueCat
   * verifies the entitlement.
   */
  if (checkingSubscription) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
        />

        <Text style={styles.statusText}>
          Checking subscription...
        </Text>
      </View>
    );
  }

  /**
   * Unauthenticated users must log in.
   */
  if (!firebaseUser) {
    return (
      <Redirect href="/(auth)/login" />
    );
  }

  /**
   * Do not redirect a barber merely because
   * RevenueCat could not be reached.
   */
  if (subscriptionError) {
    return (
      <View style={styles.center}>
        <Ionicons
          name="cloud-offline-outline"
          size={44}
          color={
            theme.colors.textSecondary
          }
        />

        <Text style={styles.errorTitle}>
          Subscription Check Unavailable
        </Text>

        <Text style={styles.errorText}>
          {subscriptionError}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() =>
            checkSubscriptionAccess(
              auth.currentUser
            )
          }
        >
          <Text
            style={
              styles.retryButtonText
            }
          >
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /**
   * Inactive barbers may only access
   * subscription-related screens.
   */
  const inactiveScreenAllowed =
    INACTIVE_BARBER_SCREENS.includes(
      currentScreen
    );

  if (
    !subscriptionActive &&
    !inactiveScreenAllowed
  ) {
    console.log(
      "⚠️ BARBER ACCESS BLOCKED",
      {
        currentScreen,
        entitlementId:
          ENTITLEMENT_ID,
        subscriptionActive,
      }
    );

    return (
      <Redirect
        href="/(app)/(barber)/barber-subscription"
      />
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor:
          theme.colors.primary,

        tabBarInactiveTintColor:
          theme.colors.textSecondary,

        tabBarStyle: {
          backgroundColor:
            theme.colors.card,

          borderTopColor:
            theme.colors.border,

          height: 70,
          paddingBottom: 10,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="grid-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="all-appointments"
        options={{
          title: "Appointments",

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="list-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="availability"
        options={{
          title: "Availability",

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="calendar-number-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="manage-services"
        options={{
          title: "Services",

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="cut-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="network"
        options={{
          title: "Network",

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="people-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="bulletin"
        options={{
          title: "Bulletin Board",

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="newspaper-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="edit-profile"
        options={{
          title: "Profile",

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="person-circle-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="chat-assistant"
        options={{
          title: "Assistant",

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Hidden screens */}

      <Tabs.Screen
        name="faq"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="chat-list"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="bulletin-post-details"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="chat"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="view-barber-profile"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="subscription-payment"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="subscription"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="new-chat"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="appointment-details"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="barber-subscription"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="stripe-onboarding"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },

  statusText: {
    marginTop: 12,
    fontSize: 15,
    color:
      theme.colors.textSecondary,
    textAlign: "center",
  },

  errorTitle: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
  },

  errorText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 21,
    color:
      theme.colors.textSecondary,
    textAlign: "center",
  },

  retryButton: {
    marginTop: 20,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor:
      theme.colors.primary,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});