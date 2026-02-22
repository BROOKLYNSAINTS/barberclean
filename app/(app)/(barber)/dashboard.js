import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getBarberAppointments,
  getUserProfile,
  auth,
} from '@/services/firebase';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';

function tsToDate(ts) {
  if (!ts) return null;
  if (typeof ts?.toDate === 'function') return ts.toDate();
  if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000);
  return null;
}

function toTime24(rawTime) {
  if (!rawTime) return null;
  const str = String(rawTime).replace(/\u202f|\u00a0/g, ' ');
  const m = str.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function isToday(appt) {
  const now = new Date();
  return appt.date === now.toISOString().slice(0, 10);
}

function isUpcoming(appt) {
  const time24 = appt.time24 || toTime24(appt.time);
  if (!time24) return false;
  const d = new Date(`${appt.date}T${time24}:00`);
  return d >= new Date();
}

export default function BarberDashboardScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user?.uid) return;

      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);

      const appts = await getBarberAppointments(user.uid);
      setAppointments(appts || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  /* =============================
     METRICS
  ============================= */

  const todayCount = useMemo(
    () => appointments.filter(isToday).length,
    [appointments]
  );

  const upcomingCount = useMemo(
    () =>
      appointments.filter(
        (a) => a.status === 'confirmed' && isUpcoming(a)
      ).length,
    [appointments]
  );

  const totalBooked = appointments.length;

  const recoveredRevenue = useMemo(() => {
    const now = new Date();
    const totalCents = appointments.reduce((sum, a) => {
      const ns = a?.noShowProtection;
      if (ns?.status !== 'charged') return sum;

      const d =
        tsToDate(ns.chargedAt) ||
        tsToDate(a.updatedAt) ||
        tsToDate(a.cancelledAt);

      if (!d) return sum;

      if (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      ) {
        return sum + (ns.amountCents || 0);
      }

      return sum;
    }, 0);

    return (totalCents / 100).toFixed(2);
  }, [appointments]);

  const upcomingAppointments = appointments
    .filter((a) => a.status === 'confirmed' && isUpcoming(a))
    .slice(0, 5);

  const handleLogout = () => {
    Alert.alert('Logout?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut(auth);
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={upcomingAppointments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.apptCard}
            onPress={() =>
              router.push({
                pathname: '/(app)/(barber)/appointment-details',
                params: { appointment: JSON.stringify(item) },
              })
            }
          >
            <View>
              <Text style={styles.apptCustomer}>
                {item.customerName}
              </Text>
              <Text style={styles.apptService}>
                {item.serviceName}
              </Text>
              <Text style={styles.apptTime}>
                {item.date} @ {item.time}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} />
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.welcome}>
                Welcome, {profile?.name}
              </Text>
              <TouchableOpacity onPress={handleLogout}>
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color="#f44336"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricNumber}>{todayCount}</Text>
                <Text style={styles.metricLabel}>Today</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricNumber}>
                  {upcomingCount}
                </Text>
                <Text style={styles.metricLabel}>
                  Upcoming (Next 5)
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricNumber}>
                  {totalBooked}
                </Text>
                <Text style={styles.metricLabel}>
                  Total Booked
                </Text>
              </View>
            </View>

            <View style={styles.recoveredCard}>
              <Text style={styles.recoveredAmount}>
                ${recoveredRevenue}
              </Text>
              <Text style={styles.recoveredLabel}>
                Recovered This Month
              </Text>
            </View>

            <Text style={styles.sectionTitle}>
              Upcoming Appointments
            </Text>
          </>
        }
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </SafeAreaView>
  );
}

/* =============================
   STYLES
============================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    padding: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  welcome: { fontSize: 20, fontWeight: '700' },

  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  metricCard: {
    backgroundColor: '#fff',
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2196F3',
  },
  metricLabel: {
    marginTop: 6,
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },

  recoveredCard: {
    backgroundColor: '#e8f5e9',
    margin: 16,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  recoveredAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2e7d32',
  },
  recoveredLabel: {
    fontSize: 13,
    marginTop: 4,
  },

  sectionTitle: {
    marginHorizontal: 16,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 8,
  },

  apptCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  apptCustomer: { fontWeight: '700' },
  apptService: { color: '#555' },
  apptTime: { color: '#777', marginTop: 4 },
});
