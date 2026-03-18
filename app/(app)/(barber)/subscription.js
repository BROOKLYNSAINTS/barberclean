import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import theme from "@/styles/theme";

const SUBSCRIPTION_URL = "https://barberreg.com/";

export default function BarberSubscriptionScreen() {

  const router = useRouter();

  const openSubscriptionSetup = () => {
    Alert.alert(
      "Subscription Setup",
      `In-app subscriptions are temporarily unavailable. Please complete setup at ${SUBSCRIPTION_URL}.`
    );
  };

  return (

    <View style={styles.container}>

      <Text style={styles.title}>Barber Subscription</Text>

      <Text style={styles.price}>$50 / month</Text>

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
        onPress={openSubscriptionSetup}
      >

        <Text style={styles.buttonText}>Open Subscription Setup</Text>

      </TouchableOpacity>

      <Text style={styles.note}>
        In-app purchase support is being updated for the current app version.
      </Text>

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
  },

  note: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 12,
    color: "#777"
  }

});