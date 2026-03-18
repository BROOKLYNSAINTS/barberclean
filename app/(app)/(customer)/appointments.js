import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCustomerAppointments, auth } from '@/services/firebase';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const user = auth.currentUser;
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      const data = await getCustomerAppointments(user.uid);

      // Hide cancelled — late_cancel & no_show still shown
      const visible = data.filter(
        (a) => a.status !== 'cancelled'
      );

      visible.sort((a, b) => {
        const da = new Date(`${a.date}T${a.time}`);
        const db = new Date(`${b.date}T${b.time}`);
        return db - da;
      });

      setAppointments(visible);
    } catch (err) {
      console.error(err);
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [fetchAppointments])
  );

  const isUpcoming = (appt) => {
    return new Date(`${appt.date}T${appt.time}`) > new Date();
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderItem = ({ item }) => {
    const upcoming = isUpcoming(item);

    return (
      <View
        style={[
          styles.card,
          upcoming ? styles.upcomingCard : styles.pastCard,
        ]}
      >
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            <Text style={styles.timeText}>{item.time}</Text>
          </View>

          <Text
            style={[
              styles.status,
              upcoming ? styles.upcoming : styles.past,
            ]}
          >
            {upcoming ? 'Upcoming' : 'Past'}
          </Text>
        </View>

        {/* DETAILS */}
        <View style={styles.body}>
          <Text style={styles.label}>Barber</Text>
          <Text>{item.barberName}</Text>

          <Text style={styles.label}>Service</Text>
          <Text>{item.serviceName}</Text>

          <Text style={styles.label}>Price</Text>
          <Text>${(item.servicePrice ?? 0).toFixed(2)}</Text>
        </View>

        {/* ACTIONS */}
        <View style={styles.actions}>
          {/* DETAILS */}
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() =>
              router.push({
                pathname: '/(app)/(customer)/appointment-details',
                params: { appointment: JSON.stringify(item) },
              })
            }
          >
            <Ionicons name="chevron-forward" size={16} color="#fff" />
            <Text style={styles.btnText}>Details</Text>
          </TouchableOpacity>

          {/* CANCEL — ONLY UPCOMING */}
          {upcoming && item.status === 'confirmed' && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() =>
                router.push({
                  pathname: '/(app)/(customer)/cancel-appointment',
                  params: {
                    appointmentId: item.id || item.appointmentId,
                    appointment: JSON.stringify(item),
                  },
                })
              }
            >
              <Ionicons name="close-circle" size={16} color="#fff" />
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text>{error}</Text>
      </View>
    );
  }

  if (!appointments.length) {
    return (
      <View style={styles.centered}>
        <Ionicons name="calendar-outline" size={64} color="#ccc" />
        <Text>No appointments</Text>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => router.push('/(app)/(customer)/')}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>
            Book Appointment
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  upcomingCard: { borderColor: '#2196F3' },
  pastCard: { borderColor: '#ddd' },

  headerRow: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: { fontSize: 16, fontWeight: '700' },
  timeText: { color: '#666' },

  status: { fontWeight: '700' },
  upcoming: { color: '#4CAF50' },
  past: { color: '#999' },

  body: { padding: 12 },
  label: { fontSize: 12, color: '#666', marginTop: 6 },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    gap: 10,
  },
  detailsBtn: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelBtn: {
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnText: { color: '#fff', fontWeight: '700' },

  bookBtn: {
    marginTop: 16,
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
