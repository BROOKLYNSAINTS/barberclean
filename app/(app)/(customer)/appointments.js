import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCustomerAppointments, auth } from '@/services/firebase'; // Adjusted path
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context'; // Add this import

const AppointmentsScreen = () => {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

  const user = auth.currentUser;
      if (user) {
        // Assuming getCustomerAppointments fetches appointments for the logged-in customer
        const appointmentsData = await getCustomerAppointments(user.uid);
        
        // Filter out cancelled appointments
        const activeAppointments = appointmentsData.filter(appointment => 
          appointment.status !== 'cancelled'
        );
        
        activeAppointments.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`);
          const dateB = new Date(`${b.date}T${b.time}`);
          return dateB - dateA;
        });
        
        setAppointments(activeAppointments);
      } else {
        setError('User not authenticated');
        // Optionally redirect to login if user is not found
         router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [fetchAppointments])
  );

  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    if (!dateString || typeof dateString !== 'string' || !dateString.includes('-')) return 'N/A';
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

  const isUpcoming = (appointment) => {
    const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
    return appointmentDate > new Date();
  };

  const renderAppointmentItem = ({ item }) => {
    const upcoming = isUpcoming(item);
    const price = item.servicePrice ?? item.price ?? null;
    
    return (
      <TouchableOpacity 
        style={[
          styles.appointmentCard,
          upcoming ? styles.upcomingCard : styles.pastCard
        ]}
        onPress={() => router.push({ 
          pathname: '/(app)/(customer)/appointment-details', 
          params: { appointment: JSON.stringify(item) } 
        })}
      >
        <View style={styles.appointmentHeader}>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusIndicator,
              upcoming ? styles.upcomingIndicator : styles.pastIndicator
            ]} />
            <Text style={styles.statusText}>
              {upcoming ? 'Upcoming' : 'Past'}
            </Text>
          </View>
        </View>
        
        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={16} color="#666" style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.barberName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="cut-outline" size={16} color="#666" style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.serviceName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#666" style={styles.detailIcon} />
            <Text style={styles.detailText}>
              {price != null ? `$${price.toFixed(2)}` : 'No price'}
            </Text>
          </View>
        </View>
        
        <View style={styles.appointmentFooter}>
          <Ionicons name="chevron-forward" size={20} color="#2196F3" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }

  if (error && !loading) { // Show error only if not loading
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchAppointments}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (appointments.length === 0 && !loading) { // Show no appointments only if not loading and no error
    return (
      <View style={styles.centered}>
        <Ionicons name="calendar-outline" size={64} color="#ccc" />
        <Text style={styles.noAppointmentsText}>No appointments found</Text>
        <TouchableOpacity 
          style={styles.bookButton}
          // BarberSelectionScreen is now (app)/(customer)/index.js
          onPress={() => router.push('/(app)/(customer)/')}
        >
          <Text style={styles.bookButtonText}>Book an Appointment</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Appointments</Text>
      </View>
      <FlatList
        data={appointments}
        renderItem={renderAppointmentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => router.push('/(app)/(customer)/')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    marginTop: 16,
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noAppointmentsText: {
    marginTop: 10,
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  bookButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  upcomingCard: {
    borderColor: '#2196F3',
  },
  pastCard: {
    borderColor: '#ddd',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateTimeContainer: {
    flexDirection: 'column',
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  upcomingIndicator: {
    backgroundColor: '#4CAF50',
  },
  pastIndicator: {
    backgroundColor: '#9e9e9e',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  appointmentDetails: {
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
  },
  appointmentFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 12,
    alignItems: 'flex-end',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2196F3',
  },
});

export default AppointmentsScreen;
