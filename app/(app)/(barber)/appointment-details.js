import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from 'firebase/auth';
import { getUserProfile } from '@/services/firebase';

function formatDate(dateString) {
  if (!dateString || !dateString.includes('-')) return 'N/A';
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function AppointmentDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  let appointment = null;
  try {
    appointment = params.appointment ? JSON.parse(params.appointment) : null;
  } catch {
    return null;
  }

  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const noShowStatus = appointment?.noShowProtection?.status;
  const noShowCharged = noShowStatus === 'charged';

  useEffect(() => {
    if (!appointment?.customerId) return;

    (async () => {
      try {
        const profile = await getUserProfile(appointment.customerId);
        setContactPhone(profile?.phone || '');
        setContactEmail(profile?.email || '');
      } catch (err) {
        console.log("⚠️ Failed to load customer contact info:", err);
      }
    })();
  }, [appointment?.customerId]);

  /* =========================================================
     MARK NO-SHOW → BACKEND CHARGE
  ========================================================= */
  const handleNoShow = useCallback(() => {
    Alert.alert(
      'Mark No-Show',
      'This will charge the customer according to your no-show policy.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Charge No-Show',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              const token = await getAuth().currentUser.getIdToken();

              const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;

              const res = await fetch(
                `${apiBase}/api/charge-no-show`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    appointmentId: appointment.id,
                  }),
                }
              );

              const data = await res.json();

              console.log("🔎 NO SHOW API STATUS:", res.status);
              console.log("🔎 NO SHOW API RESPONSE:", data);

              if (!res.ok) {
                throw new Error(
                  data?.details ||
                  data?.error ||
                  `HTTP ${res.status}`
                );
              }

              Alert.alert(
                'No-Show Charged',
                `Customer charged successfully.\nPaymentIntent: ${data.paymentIntentId}`
              );

              router.back();

            } catch (err) {
              console.log("❌ Late fee charge failed:", err.message);
              Alert.alert('Charge Failed', err.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [appointment?.id, router]);

  const handleContact = () => {
    const options = [];

    if (contactPhone) {
      options.push({
        text: `Call ${contactPhone}`,
        onPress: () => Linking.openURL(`tel:${contactPhone}`),
      });
    }

    if (contactEmail) {
      options.push({
        text: `Email ${contactEmail}`,
        onPress: () => Linking.openURL(`mailto:${contactEmail}`),
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Contact Customer', 'Choose a method:', options);
  };

  if (!appointment) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* STATUS */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              noShowCharged
                ? styles.statusNoShow
                : appointment.status === 'cancelled'
                ? styles.statusCancelled
                : styles.statusConfirmed,
            ]}
          >
            <Text style={styles.statusText}>
              {noShowCharged
                ? 'NO-SHOW CHARGED'
                : appointment.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* CUSTOMER */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text>{appointment.customerName}</Text>
          {!!contactPhone && <Text>{contactPhone}</Text>}
          {!!contactEmail && <Text>{contactEmail}</Text>}
        </View>

        {/* APPOINTMENT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment</Text>
          <Text>{formatDate(appointment.date)}</Text>
          <Text>{appointment.time}</Text>
          <Text>{appointment.serviceName}</Text>
          <Text>${Number(appointment.servicePrice || 0).toFixed(2)}</Text>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.contactButton]}
            onPress={handleContact}
          >
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Contact Customer</Text>
          </TouchableOpacity>

          {!noShowCharged && appointment.status === 'confirmed' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.noShowButton]}
              onPress={handleNoShow}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="alert-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    Mark No-Show
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  scrollContent: { padding: 16 },
  statusContainer: { alignItems: 'center', marginBottom: 16 },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusConfirmed: { backgroundColor: '#4CAF50' },
  statusCancelled: { backgroundColor: '#f44336' },
  statusNoShow: { backgroundColor: '#FF5722' },
  statusText: { color: '#fff', fontWeight: 'bold' },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: { fontWeight: '600', marginBottom: 8 },
  actionsContainer: { marginTop: 8 },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  contactButton: { backgroundColor: '#2196F3' },
  noShowButton: { backgroundColor: '#FF5722' },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
});
