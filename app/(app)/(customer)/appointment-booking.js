import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { getBarberAvailability, createAppointment, getUserProfile } from '@/services/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import DebugUser from '@/components/DebugUser';

export default function AppointmentBookingScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const service = params.service ? JSON.parse(params.service) : null;
  
  // Debug logging for navigation data
  console.log('🔍 AppointmentBooking - Received params:', params);
  console.log('🔍 AppointmentBooking - Parsed service:', service);

  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');

  // Utility function to safely format a date string as YYYY-MM-DD
  function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getMaxDateString(monthsToAdd = 3) {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + monthsToAdd);
    const year = maxDate.getFullYear();
    const month = String(maxDate.getMonth() + 1).padStart(2, '0');
    const day = String(maxDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const today = getTodayString();
  const maxDateStr = getMaxDateString();

  const barber = useMemo(() => {
    const result = params.barber ? JSON.parse(params.barber) : null;
    console.log('🔍 AppointmentBooking - Parsed barber:', result);
    return result;
  }, [params.barber]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!barber?.id || !selectedDate) {
        setAvailableSlots([]);
        return;
      }

      try {
        setLoadingSlots(true);
        setError('');
        console.log("🔄 Fetching slots for", barber.id, "on", selectedDate);
        const availability = await getBarberAvailability(barber.id);

        const slotsForDate = Array.isArray(availability)
          ? availability
              .filter((slot) => slot.date === selectedDate && !!slot.time)
              .map((slot) => slot.time)
          : [];

        setAvailableSlots(slotsForDate);
      } catch (err) {
        console.error('Error fetching available slots:', err);
        setAvailableSlots([]);
        setError('Unable to load time slots');
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [barber?.id, selectedDate]);

  const handleDateSelect = (date) => {
    setSelectedDate(date.dateString);
    setSelectedSlot('');
  };

  const handleTimeSelect = (time) => {
    setSelectedSlot(time);
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedSlot) {
      Alert.alert('Error', 'Please select both date and time for your appointment');
      return;
    }

    if (!barber || !service) {
      Alert.alert('Error', 'Barber or Service details are missing.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to book an appointment.');
        setLoading(false);
        router.replace('/(auth)/login');
        return;
      }

      const profile = await getUserProfile(currentUser.uid);
      const customerName = profile?.name || 'Customer';

      const appointmentData = {
        customerId: currentUser.uid,
        barberId: barber.id,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        date: selectedDate,
        time: selectedSlot,
        barberName: barber.name,
        customerName,
      };

      console.log('📅 Booking appointment with data:', appointmentData);

      const appointment = await createAppointment(appointmentData);

      router.push({
        pathname: '/(app)/(customer)/appointment-confirmation',
        params: {
          appointment: JSON.stringify(appointment),
          barber: JSON.stringify(barber),
          service: JSON.stringify(service),
        },
      });
    } catch (error) {
      console.error('Error booking appointment:', error);
      setError('Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderTimeSlots = () => {
    if (loadingSlots) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#2196F3" />
          <Text style={styles.loadingText}>Loading available times...</Text>
        </View>
      );
    }

    if (error && availableSlots.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    if (availableSlots.length === 0 && selectedDate) {
      return (
        <View style={styles.centered}>
          <Text style={styles.noSlotsText}>No available slots for this date</Text>
        </View>
      );
    }

    return (
      <View style={styles.timeSlotsContainer}>
        {availableSlots.map((time) => (
          <TouchableOpacity
            key={time}
            style={[
              styles.timeSlot,
              selectedSlot === time && styles.selectedTimeSlot,
            ]}
            onPress={() => handleTimeSelect(time)}
          >
            <Text
              style={[
                styles.timeSlotText,
                selectedSlot === time && styles.selectedTimeSlotText,
              ]}
            >
              {time}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!barber || !service) {
    console.log('❌ AppointmentBooking - Missing data:', { barber, service });
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
        <Text style={styles.errorText}>
          {error || `Missing data: ${!barber ? 'barber' : ''} ${!service ? 'service' : ''}`}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.serviceInfoCard}>
        <Text style={styles.serviceInfoTitle}>Booking Details</Text>
        <View style={styles.serviceInfoRow}>
          <Text style={styles.serviceInfoLabel}>Barber:</Text>
          <Text style={styles.serviceInfoValue}>{barber.name}</Text>
        </View>
        <View style={styles.serviceInfoRow}>
          <Text style={styles.serviceInfoLabel}>Service:</Text>
          <Text style={styles.serviceInfoValue}>{service.name}</Text>
        </View>
        <View style={styles.serviceInfoRow}>
          <Text style={styles.serviceInfoLabel}>Duration:</Text>
          <Text style={styles.serviceInfoValue}>{service.duration} min</Text>
        </View>
        <View style={styles.serviceInfoRow}>
          <Text style={styles.serviceInfoLabel}>Price:</Text>
          <Text style={styles.serviceInfoValue}>${service.price.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Select Date</Text>
        <Calendar
          minDate={today}
          maxDate={maxDateStr}
          onDayPress={handleDateSelect}
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: '#2196F3' },
          }}
          theme={{
            todayTextColor: '#2196F3',
            arrowColor: '#2196F3',
            dotColor: '#2196F3',
            selectedDotColor: '#ffffff',
          }}
        />
      </View>

      {selectedDate && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Select Time</Text>
          {renderTimeSlots()}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.bookButton,
          (!selectedDate || !selectedSlot || loading) && styles.disabledButton,
        ]}
        onPress={handleBookAppointment}
        disabled={!selectedDate || !selectedSlot || loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  serviceInfoCard: { margin: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  serviceInfoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  serviceInfoRow: { flexDirection: 'row', marginBottom: 8 },
  serviceInfoLabel: { fontWeight: '500', width: 80 },
  serviceInfoValue: { flex: 1 },
  sectionContainer: { margin: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { marginTop: 8, color: '#666' },
  errorText: { color: '#f44336', textAlign: 'center', marginTop: 10 },
  retryButton: { marginTop: 16, backgroundColor: '#2196F3', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
  retryButtonText: { color: '#fff', fontWeight: 'bold' },
  noSlotsText: { color: '#666', textAlign: 'center' },
  timeSlotsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  timeSlot: { backgroundColor: '#f5f5f5', borderRadius: 4, padding: 12, margin: 4, borderWidth: 1, borderColor: '#ddd' },
  selectedTimeSlot: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  timeSlotText: { color: '#333' },
  selectedTimeSlotText: { color: '#fff', fontWeight: 'bold' },
  bookButton: { backgroundColor: '#2196F3', padding: 16, margin: 16, borderRadius: 8, alignItems: 'center' },
  disabledButton: { backgroundColor: '#cccccc' },
  bookButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
