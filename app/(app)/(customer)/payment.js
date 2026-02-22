import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useStripe,
  createAndPresentServicePaymentSheet,
} from "@/services/stripe";
import { db, doc, getDoc } from "@/services/firebase";

export default function PaymentScreen() {
  const router = useRouter();
  const stripe = useStripe();
  const params = useLocalSearchParams();

  const appointmentId = params.appointmentId;
  const serviceName = params.serviceName || "Service";
  const barberName = params.barberName || "Barber";
  const normalizeAmount = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const amount = normalizeAmount(params.amount);

  const [loading, setLoading] = useState(false);

  const isWebhookConfirmed = (appointment) => {
    const status = String(
      appointment?.paymentStatus ||
        appointment?.payment?.status ||
        appointment?.latestPayment?.status ||
        ""
    ).toLowerCase();

    return (
      status === "paid" ||
      status === "completed" ||
      status === "succeeded" ||
      !!appointment?.paidAt ||
      !!appointment?.payment?.paidAt ||
      !!appointment?.latestPayment?.paidAt
    );
  };

  const extractConfirmedAmount = (appointment) => {
    const dollarFields = [
      appointment?.amountCharged,
      appointment?.amountPaid,
      appointment?.chargedAmount,
      appointment?.paidAmount,
      appointment?.paymentAmount,
      appointment?.payment?.amount,
      appointment?.payment?.amountCharged,
      appointment?.payment?.amountPaid,
      appointment?.latestPayment?.amount,
      appointment?.latestPayment?.amountCharged,
      appointment?.latestPayment?.amountPaid,
    ];

    for (const value of dollarFields) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }

    const centFields = [
      appointment?.amountCentsCharged,
      appointment?.amountPaidCents,
      appointment?.payment?.amountCents,
      appointment?.payment?.amountChargedCents,
      appointment?.latestPayment?.amountCents,
      appointment?.latestPayment?.amountChargedCents,
    ];

    for (const value of centFields) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) return parsed / 100;
    }

    return null;
  };

  const waitForWebhookConfirmation = async (id, timeoutMs = 30000, intervalMs = 1500) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const snap = await getDoc(doc(db, "appointments", id));
      const appointment = snap.exists() ? snap.data() : null;
      const confirmed = isWebhookConfirmed(appointment);
      const confirmedAmount = extractConfirmedAmount(appointment);

      if (confirmed && Number.isFinite(confirmedAmount)) {
        return confirmedAmount;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(
      "Payment submitted, but confirmation is still pending. Please refresh in a moment."
    );
  };

  const handlePay = async () => {
    try {
      setLoading(true);

      if (!appointmentId) {
        throw new Error("Missing appointment ID");
      }

      const result = await createAndPresentServicePaymentSheet(
        stripe,
        appointmentId,
        serviceName
      );

      if (result?.canceled) {
        Alert.alert("Payment Canceled", "No charge was made.");
        return;
      }

      if (!result?.success) {
        throw new Error("Payment failed");
      }

      const confirmedAmount = await waitForWebhookConfirmation(appointmentId);
      Alert.alert("Payment Successful", `Charged $${confirmedAmount.toFixed(2)}`);

      router.back();

    } catch (err) {
      Alert.alert("Payment Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{serviceName}</Text>
        <Text style={styles.subtitle}>with {barberName}</Text>
        <Text style={styles.amount}>${amount.toFixed(2)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handlePay}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            Pay ${amount.toFixed(2)}
          </Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    padding: 24,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    marginBottom: 30,
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "bold" },
  subtitle: { color: "#666", marginTop: 4 },
  amount: { fontSize: 28, fontWeight: "bold", marginTop: 12 },
  button: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
