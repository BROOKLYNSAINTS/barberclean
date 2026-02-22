import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { cancelAppointment, getDoc, doc, db } from '@/services/firebase'; // see note below

export default function CancelAppointmentScreen() {
  // ✅ Hooks must ALWAYS be called (no early returns before hooks)
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState(null);
  const [fetching, setFetching] = useState(true);

  // Accept either an appointment json param or an appointmentId param
  const appointmentId = useMemo(() => {
    if (params?.appointmentId) return String(params.appointmentId);
    if (params?.id) return String(params.id);
    return null;
  }, [params?.appointmentId, params?.id]);

  const appointmentParam = useMemo(() => {
    if (!params?.appointment) return null;
    try {
      return JSON.parse(String(params.appointment));
    } catch {
      return null;
    }
  }, [params?.appointment]);

  // ✅ Load appointment if not provided
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setFetching(true);

        // If screen was passed appointment JSON, use it
        if (appointmentParam?.id) {
          if (alive) setAppointment(appointmentParam);
          return;
        }

        // Otherwise fetch by id
        if (appointmentId) {
          const snap = await getDoc(doc(db, 'appointments', appointmentId));
          if (snap.exists() && alive) {
            setAppointment({ id: snap.id, ...snap.data() });
          }
        }
      } catch (e) {
        console.log('❌ Failed to load appointment for cancel screen:', e);
      } finally {
        if (alive) setFetching(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [appointmentId, appointmentParam]);

  const doCancel = useCallback(async () => {
    if (!currentUser?.uid) {
      Alert.alert('Error', 'You must be logged in to cancel.');
      return;
    }
    if (!appointment?.id) {
      Alert.alert('Error', 'Missing appointment id.');
      return;
    }

    try {
      setLoading(true);

      // ✅ Your firebase.js cancelAppointment expects (appointmentId, userId)
      await cancelAppointment(appointment.id, currentUser.uid);

      Alert.alert('Cancelled', 'Your appointment has been cancelled.', [
        {
          text: 'OK',
          onPress: () => {
            // Go back to a safe place
            router.replace('/(app)/(customer)/appointments');
          },
        },
      ]);
    } catch (e) {
      console.log('❌ Cancel failed:', e);
      Alert.alert('Error', e?.message || 'Failed to cancel appointment.');
    } finally {
      setLoading(false);
    }
  }, [appointment?.id, currentUser?.uid, router]);

  const confirmCancel = useCallback(() => {
    Alert.alert(
      'Cancel Appointment',
      'If this is within the barber’s cancellation window, a late cancellation fee may apply.',
      [
        { text: 'Keep Appointment', style: 'cancel' },
        { text: 'Cancel Appointment', style: 'destructive', onPress: doCancel },
      ]
    );
  }, [doCancel]);

  // ✅ UI (NO hooks below this point)
  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading appointment…</Text>
      </View>
    );
  }

  if (!appointment?.id) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Appointment not found</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cancel Appointment</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Barber</Text>
        <Text style={styles.value}>{appointment.barberName || '—'}</Text>

        <Text style={styles.label}>Service</Text>
        <Text style={styles.value}>{appointment.serviceName || '—'}</Text>

        <Text style={styles.label}>Date</Text>
        <Text style={styles.value}>{appointment.date || '—'}</Text>

        <Text style={styles.label}>Time</Text>
        <Text style={styles.value}>{appointment.time || '—'}</Text>
      </View>

      <TouchableOpacity
        style={[styles.dangerBtn, (loading || fetching) && styles.disabled]}
        disabled={loading || fetching}
        onPress={confirmCancel}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.dangerText}>Cancel Appointment</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
        <Text style={styles.secondaryText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * NOTE:
 * This file imports getDoc/doc/db from '@/services/firebase'.
 * Your firebase.js currently exports db at the bottom:
 * export { app, auth, db, functions, onAuthStateChanged };
 * ✅ So that works.
 */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  muted: { color: '#666' },
  card: { padding: 14, borderRadius: 10, backgroundColor: '#f5f5f5', marginBottom: 16 },
  label: { fontSize: 12, color: '#666', marginTop: 8 },
  value: { fontSize: 16, fontWeight: '600' },
  dangerBtn: { padding: 14, borderRadius: 10, backgroundColor: '#d32f2f', alignItems: 'center' },
  dangerText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { marginTop: 12, padding: 14, borderRadius: 10, backgroundColor: '#eee', alignItems: 'center' },
  secondaryText: { fontWeight: '700', color: '#333' },
  disabled: { opacity: 0.6 },
});
