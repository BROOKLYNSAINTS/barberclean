import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBarberAppointments, getUserProfile, auth } from '@/services/firebase';
import { useRouter, useFocusEffect } from 'expo-router';
import { createDummyAppointments } from "@/utils/test";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from 'firebase/auth';
const BarberDashboardScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // Add this hook
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const user = auth.currentUser;
      console.log('🔍 Fetching user profile for UID:', user?.uid);
      console.log("auth:", auth);
      console.log("currentUser:", auth?.currentUser);

      if (!user) {
        setError('User not authenticated.');
        router.replace('/(auth)/login');
        setLoading(false);
        return;
      }
      
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
      
      if (userProfile && userProfile.role !== 'barber') {
        setError('Access denied. This dashboard is for barbers only.');
        // Optionally redirect to customer dashboard or login
        // router.replace('/(app)/(customer)/'); 
        setLoading(false);
        return;
      }

      const appointmentsData = await getBarberAppointments(user.uid) || [];

      appointmentsData.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
      });

      setAppointments(appointmentsData);

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      const todayAppts = appointmentsData.filter(appt => appt.date === today);
      setTodayAppointments(todayAppts);

      const upcoming = appointmentsData.filter(appt => {
        const appointmentDateTime = new Date(`${appt.date}T${appt.time}`);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return appointmentDateTime >= todayStart && appt.date !== today;
      });
      setUpcomingAppointments(upcoming.slice(0, 5));
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]); // Added router to dependency array for safety, though not directly used in fetchData's logic

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const formatDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string' || !dateString.includes('-')) return 'N/A';
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    // Parse as local date to avoid UTC shift bug
    const [year, month, day] = dateString.split('-').map(Number);
    if (
      isNaN(year) ||
      isNaN(month) ||
      isNaN(day)
    ) return 'N/A';
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString(undefined, options);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
    );
  };

  const renderAppointmentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.appointmentCard}
      onPress={() => router.push({
        pathname: '/(app)/(barber)/appointment-details',
        params: { appointment: JSON.stringify(item) }
      })}
    >
      <View style={styles.appointmentTime}>
        <Text style={styles.timeText}>{item.time}</Text>
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
      </View>
      
      <View style={styles.appointmentInfo}>
        <Text style={styles.customerName}>{item.customerName || 'N/A'}</Text>
        <Text style={styles.serviceName}>{item.serviceName || 'N/A'}</Text>
        <Text style={styles.servicePrice}>${item.servicePrice?.toFixed(2) || '0.00'}</Text>
      </View>
      
      <View style={styles.appointmentAction}>
        <Ionicons name="chevron-forward" size={24} color="#2196F3" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <>
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 20 }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcomeText}>Welcome, {profile?.name || 'Barber'}</Text>
            {profile?.subscription?.status === 'active' ? (
              <View style={styles.subscriptionActive}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.subscriptionActiveText}>Subscription Active</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.subscriptionInactive}
                onPress={() => router.push('/(app)/(barber)/subscription-payment')}
              >
                <Ionicons name="alert-circle" size={16} color="#f44336" />
                <Text style={styles.subscriptionInactiveText}>Subscription Inactive</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={18} color="#f44336" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 12, color: '#777' }}>
          Use the red button to logout
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{todayAppointments.length}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{upcomingAppointments.length}</Text>
            <Text style={styles.statLabel}>Upcoming (Next 5)</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{appointments.length}</Text>
            <Text style={styles.statLabel}>Total Booked</Text>
          </View>
        </View>

        {/* Show a special message if the barber has no appointments at all */}
        {appointments.length === 0 && !loading && !error && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You have no appointments yet. Share your booking link or set up your services to get started!</Text>
          </View>
        )}

        <FlatList
          data={null} // To render sections in ListHeaderComponent and ListFooterComponent
          ListHeaderComponent={
            <>
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Today's Appointments</Text>
                  {todayAppointments.length > 0 && 
                    <TouchableOpacity onPress={() => router.push('/(app)/(barber)/all-appointments?filter=today')}>
                      <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                  }
                </View>
                {todayAppointments.length > 0 ? (
                  <FlatList
                    data={todayAppointments}
                    renderItem={renderAppointmentItem}
                    keyExtractor={(item) => item.id.toString() + "-today"}
                    scrollEnabled={false}
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No appointments scheduled for today.</Text>
                  </View>
                )}
              </View>

              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                   {upcomingAppointments.length > 0 && 
                    <TouchableOpacity onPress={() => router.push('/(app)/(barber)/all-appointments?filter=upcoming')}>
                      <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                  }
                </View>
                {upcomingAppointments.length > 0 ? (
                  <FlatList
                    data={upcomingAppointments}
                    renderItem={renderAppointmentItem}
                    keyExtractor={(item) => item.id.toString() + "-upcoming"}
                    scrollEnabled={false}
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No upcoming appointments.</Text>
                  </View>
                )}
              </View>
            </>
          }
          ListFooterComponentStyle={{paddingBottom: 20}}
          ListFooterComponent={
            <>
              <View style={{ height: 20 }} />
            </>
          }
        />
      </>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f2f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 16, // This will be overridden by the dynamic padding
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerLeft: {
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f44336',
    backgroundColor: '#fff5f5',
    marginLeft: 8,
  },
  logoutText: {
    marginLeft: 6,
    color: '#f44336',
    fontWeight: '600',
    fontSize: 14,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subscriptionActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  subscriptionActiveText: {
    color: '#4CAF50',
    marginLeft: 6,
    fontWeight: '500',
    fontSize: 12,
  },
  subscriptionInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  subscriptionInactiveText: {
    color: '#f44336',
    marginLeft: 6,
    fontWeight: '500',
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f0f2f5',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
  sectionContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: '#f0f2f5',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4, 
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  seeAllText: {
    color: '#2196F3',
    fontWeight: '500',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentTime: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#eee',
    paddingRight: 10,
    marginRight: 10,
  },
  timeText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },
  appointmentInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
  },
  serviceName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  servicePrice: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '500',
    marginTop: 3,
  },
  appointmentAction: {
    justifyContent: 'center',
    paddingLeft: 10,
  },
});

export default BarberDashboardScreen;

