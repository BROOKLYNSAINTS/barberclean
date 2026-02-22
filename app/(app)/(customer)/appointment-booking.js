import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import {
  getBarberAvailability,
  createAppointment,
  getUserProfile,
} from '@/services/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { presentSetupIntentSheet } from '@/services/stripe';
import { useStripe } from '@stripe/stripe-react-native';

const toLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseRouteParam = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;

  if (typeof value !== 'string') return null;

  try {
    return JSON.parse(value);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch {
      return null;
    }
  }
};

export default function AppointmentBookingScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const stripe = useStripe();
  const params = useLocalSearchParams();

  const service = useMemo(() => parseRouteParam(params.service), [params.service]);
  const barber = useMemo(() => parseRouteParam(params.barber), [params.barber]);

  const [availabilityData, setAvailabilityData] = useState([]);
  const [openDates, setOpenDates] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const today = toLocalDateString(new Date());
  const maxDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return toLocalDateString(d);
  })();

  /* ---------------------------------------------------- */
  /* Load availability                                   */
  /* ---------------------------------------------------- */
  useEffect(() => {
    if (!barber?.id) return;

    (async () => {
      try {
        const data = await getBarberAvailability(barber.id);
        setAvailabilityData(data);
        setOpenDates(new Set(data.map((s) => s.date)));
      } catch (error) {
        console.error('Failed to load barber availability:', error);
        setAvailabilityData([]);
        setOpenDates(new Set());
        Alert.alert(
          'Availability Unavailable',
          'We could not load this barber availability right now. Please try again shortly.'
        );
      }
    })();
  }, [barber?.id]);

  /* ---------------------------------------------------- */
  /* Compute slots                                        */
  /* ---------------------------------------------------- */
  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      return;
    }

    const slots = availabilityData
      .filter((s) => s.date === selectedDate)
      .map((s) => s.time);

    setAvailableSlots(slots);
  }, [selectedDate, availabilityData]);

  /* ---------------------------------------------------- */
  /* Calendar markings                                    */
  /* ---------------------------------------------------- */
  const markedDates = useMemo(() => {
    const marks = {};
    let current = new Date(today);
    const end = new Date(maxDate);

    while (current <= end) {
      const dateStr = toLocalDateString(current);
      if (!openDates.has(dateStr)) {
        marks[dateStr] = {
          disabled: true,
          disableTouchEvent: true,
        };
      }
      current.setDate(current.getDate() + 1);
    }

    if (selectedDate) {
      marks[selectedDate] = {
        selected: true,
        selectedColor: '#2196F3',
      };
    }

    return marks;
  }, [openDates, selectedDate]);

  /* ---------------------------------------------------- */
  /* BOOK APPOINTMENT                                    */
  /* ---------------------------------------------------- */
  const handleBookAppointment = async () => {
    if (!currentUser || !barber || !service) {
      Alert.alert('Error', 'Missing booking data');
      return;
    }

    if (!selectedDate || !selectedSlot) {
      Alert.alert('Error', 'Select date and time');
      return;
    }

    if (!smsOptIn) {
      Alert.alert(
        'SMS Consent Required',
        'Please agree to receive SMS appointment reminders and updates to continue booking.'
      );
      return;
    }

    try {
      setLoading(true);

      const profile = await getUserProfile(currentUser.uid);
      const customerName = profile?.name || 'Customer';
      const customerEmail = profile?.email || currentUser.email || undefined;

      // 🔥 OPEN STRIPE SETUP SHEET
      const setupResult = await presentSetupIntentSheet(stripe, {
        customerId: currentUser.uid,
        customerName,
        customerEmail,
      });

      if (setupResult?.canceled) {
        Alert.alert(
          'Card Setup Canceled',
          'Please add a card to continue booking.'
        );
        return;
      }

      if (!setupResult?.success) {
        const setupErrorMessage =
          setupResult?.error?.message || 'Unable to add card. Please try again.';

        console.error('SetupIntent failed:', setupResult?.error || setupResult);
        Alert.alert(
          'Payment Setup Failed',
          setupErrorMessage
        );
        return;
      }

      const appointmentData = {
        customerId: currentUser.uid,
        customerName,
        barberId: barber.id,
        barberName: barber.name,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price || 0,
        serviceDuration: service.duration || 30,
        date: selectedDate,
        time: selectedSlot,
        smsOptIn,
        smsOptInAt: smsOptIn ? new Date().toISOString() : null,
      };

      const appointment = await createAppointment(appointmentData);

      router.push({
        pathname: '/(app)/(customer)/appointment-confirmation',
        params: {
          appointment: JSON.stringify(appointment),
          barber: JSON.stringify(barber),
          service: JSON.stringify(service),
        },
      });
    } catch (err) {
      console.error('Booking error:', err);
      Alert.alert('Error', err.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------- */
  /* UI                                                   */
  /* ---------------------------------------------------- */
  if (!barber || !service) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#f44336" />
        <Text style={styles.error}>Missing barber or service</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Booking Details</Text>
        <Text>Barber: {barber.name}</Text>
        <Text>Service: {service.name}</Text>
        <Text>Duration: {service.duration} min</Text>
        <Text>Price: ${Number(service.price || 0).toFixed(2)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Date</Text>
        <Calendar
          minDate={today}
          maxDate={maxDate}
          markedDates={markedDates}
          onDayPress={(d) => {
            if (!openDates.has(d.dateString)) {
              Alert.alert('Shop Closed', 'This barber is not available on this date.');
              return;
            }
            setSelectedDate(d.dateString);
            setSelectedSlot('');
          }}
        />
      </View>

      {selectedDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time</Text>

          {availableSlots.length === 0 ? (
            <Text style={{ color: '#f44336' }}>
              Shop is closed or no available slots.
            </Text>
          ) : (
            <View style={styles.slotWrap}>
              {availableSlots.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.slot,
                    selectedSlot === t && styles.slotSelected,
                  ]}
                  onPress={() => setSelectedSlot(t)}
                >
                  <Text
                    style={[
                      styles.slotText,
                      selectedSlot === t && styles.slotTextSelected,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.smsOptInRow}
          onPress={() => setSmsOptIn((prev) => !prev)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={smsOptIn ? 'checkbox' : 'square-outline'}
            size={24}
            color={smsOptIn ? '#2196F3' : '#666'}
            style={styles.smsCheckbox}
          />
          <Text style={styles.smsOptInText}>
            I agree to receive SMS appointment reminders and updates from
            ScheduleSync AI LLC. Message frequency varies. Message & data rates
            may apply. Reply STOP to unsubscribe. Reply HELP for help.
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.bookButton, (!smsOptIn || loading) && styles.disabled]}
        onPress={handleBookAppointment}
        disabled={!smsOptIn || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.bookText}>Book Appointment</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#f44336', marginTop: 8 },
  card: { margin: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  section: { margin: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  smsOptInRow: { flexDirection: 'row', alignItems: 'flex-start' },
  smsCheckbox: { marginTop: 1, marginRight: 8 },
  smsOptInText: { flex: 1, color: '#444', lineHeight: 20, fontSize: 13 },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  slot: { padding: 10, margin: 4, borderRadius: 6, backgroundColor: '#eee' },
  slotSelected: { backgroundColor: '#2196F3' },
  slotText: { color: '#333' },
  slotTextSelected: { color: '#fff', fontWeight: 'bold' },
  bookButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignItems: 'center',
  },
  bookText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disabled: { opacity: 0.6 },
});
