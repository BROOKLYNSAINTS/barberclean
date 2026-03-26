import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  db,
} from '@/services/firebase';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

function isToday(appt) {
  const now = new Date();
  return appt.date === now.toISOString().slice(0, 10);
}

function isUpcoming(appt) {
  const time = appt.time || '00:00';
  const d = new Date(`${appt.date}T${time}:00`);
  return d >= new Date();
}

export default function BarberDashboardScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);

  /**
   * 🔥 ACCESS CONTROL (UPDATED FOR REVENUECAT)
   */
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          setCheckingAccess(false);
          return;
        }

        const userRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userRef);
        const data = snapshot.data();

        console.log("🔥 USER DATA:", data);

        // ✅ Stripe onboarding check
        if (!data?.stripeConnectOnboardingComplete) {
          console.log("🚫 Stripe onboarding NOT complete");
          router.replace('/(app)/(barber)/stripe-onboarding');
          return;
        }

        // ✅ NEW: RevenueCat subscription check
        if (data?.subscription?.status !== "active") {
          console.log("🚫 No active subscription — redirecting");
          router.replace('/(app)/(barber)/barber-subscription');
          return;
        }

        console.log("✅ ACCESS GRANTED");

      } catch (error) {
        console.log("Access check failed:", error);
      } finally {
        setCheckingAccess(false);
      }
    };

    verifyAccess();
  }, [router]);

  /**
   * 🔥 LOAD DATA
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;
      if (!user?.uid) return;

      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);

      const appts = await getBarberAppointments(user.uid);
      setAppointments(appts || []);

    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  /**
   * 🔥 STATS
   */
  const todayCount = useMemo(
    () => appointments.filter(isToday).length,
    [appointments]
  );

  const upcomingCount = useMemo(
    () => appointments.filter((a) => isUpcoming(a)).length,
    [appointments]
  );

  const totalBooked = appointments.length;

  /**
   * 🔥 LOGOUT
   */
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

  /**
   * 🔥 LOADING STATE
   */
  if (loading || checkingAccess) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  /**
   * 🔥 SAFETY FALLBACK
   */
  if (!profile) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>No profile found</Text>
      </SafeAreaView>
    );
  }

  /**
   * 🔥 MAIN UI
   */
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}

        renderItem={({ item }) => (
          <TouchableOpacity style={styles.apptCard}>
            <View>
              <Text style={styles.apptCustomer}>{item.customerName}</Text>
              <Text style={styles.apptService}>{item.serviceName}</Text>
              <Text style={styles.apptTime}>
                {item.date} @ {item.time}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} />
          </TouchableOpacity>
        )}

        ListHeaderComponent={
          <View>

            <View style={styles.header}>
              <Text style={styles.welcome}>
                Welcome, {profile?.name || "Barber"}
              </Text>

              <TouchableOpacity onPress={handleLogout}>
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color="#f44336"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{todayCount}</Text>
                <Text style={styles.statLabel}>Today</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{upcomingCount}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{totalBooked}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>

            </View>

          </View>
        }

        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20 }}>
            No appointments yet
          </Text>
        }

        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </SafeAreaView>
  );
}

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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 5,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 4,
    color: '#777',
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
