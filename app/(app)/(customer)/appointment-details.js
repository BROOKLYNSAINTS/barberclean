import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth, getUserProfile, cancelAppointment } from '@/services/firebase';
import { addAppointmentToCalendar, scheduleAppointmentReminder, cancelAppointmentNotifications, removeAppointmentFromCalendar } from '@/services/notifications';
import { createAndPresentServicePaymentSheet, getAppointmentPaymentStatus } from '@/services/stripe';
import { useStripe } from "@/services/stripe";

const AppointmentDetailsScreen = () => {
  const router = useRouter();
  const { presentPaymentSheet } = useStripe();
  
  // Safe JSON parsing utility
  const safeParse = (input) => {
    if (!input) return null;
    try {
      return typeof input === 'string' ? JSON.parse(input) : input;
    } catch (err) {
      return null;
    }
  };

  // Use safeParse for params
  const params = useLocalSearchParams();
  
  // Add debugging to see what we're actually receiving
  console.log('🔍 Raw params received:', params);
  console.log('🔍 Appointment param:', params.appointment);
  
  const appointment = safeParse(params.appointment);

  console.log('🔍 Parsed appointment:', appointment);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState({ isPaid: false, amount: 0, paidAt: null });
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  useEffect(() => {
    try {
      if (!appointment) {
        setError('Appointment data not found.');
        setLoading(false);
        return;
      }

      // Check if appointment has required fields
      if (!appointment.barberName || !appointment.serviceName || !appointment.servicePrice) {
        setError('Appointment is missing required data.');
        setLoading(false);
        return;
      }

      // Check if appointment has an ID (needed for cancellation)
      if (!appointment.id) {
        console.warn('⚠️ Appointment missing ID field:', appointment);
        // You can still view the appointment, but cancellation won't work
      }

      const fetchProfile = async () => {
        try {
          const user = auth.currentUser;
          if (user) {
            const userProfile = await getUserProfile(user.uid);
            setProfile(userProfile);
            
            // Check payment status if appointment has an ID
            if (appointment.id) {
              const paymentInfo = await getAppointmentPaymentStatus(appointment.id);
              setPaymentStatus(paymentInfo);
              console.log('💳 Payment status for appointment:', paymentInfo);
            }
          }
        } catch (err) {
          console.error('Error loading profile:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    } catch (err) {
      console.error('Error:', err);
      setError('Invalid data format.');
      setLoading(false);
    }
    // ✅ Empty dependency array so this runs only once
  }, []);

  // Fix the date shift bug by parsing as local date
  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    if (!dateString || typeof dateString !== 'string' || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString(undefined, options);
  };

  const handleAddToCalendar = async () => {
    if (!appointment) return;
    try {
      setProcessing(true);
      await addAppointmentToCalendar(appointment);
      setCalendarAdded(true);
      Alert.alert('Success', 'Appointment added to calendar.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not add to calendar.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSetReminder = async () => {
    if (!appointment) return;
    try {
      setProcessing(true);
      await scheduleAppointmentReminder(appointment);
      setReminderSet(true);
      Alert.alert('Success', 'Reminder set.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not set reminder.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelAppointment = async () => {
    // Check if appointment has ID
    if (!appointment?.id) {
      Alert.alert(
        'Error',
        'Cannot cancel appointment: missing appointment ID. Please contact support.'
      );
      return;
    }

    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              
              // Cancel the appointment in Firestore
              await cancelAppointment(appointment.id, auth.currentUser?.uid);
              
              // Cancel related notifications
              await cancelAppointmentNotifications(appointment.id, auth.currentUser?.uid);
              
              // Remove from iOS calendar
              await removeAppointmentFromCalendar(appointment);
              
              Alert.alert(
                'Cancelled', 
                'Your appointment has been cancelled successfully. Any scheduled reminders and calendar events have also been removed.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.back()
                  }
                ]
              );
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              Alert.alert(
                'Error', 
                'Could not cancel appointment. Please try again or contact support.'
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handlePayForService = async () => {
    if (!appointment?.id) {
      Alert.alert('Error', 'Cannot process payment: missing appointment ID.');
      return;
    }

    if (paymentStatus.isPaid) {
      Alert.alert('Already Paid', 'This service has already been paid for.');
      return;
    }

    try {
      setPaymentProcessing(true);
      
      // Use the new Stripe payment sheet integration
      const result = await createAndPresentServicePaymentSheet(
        auth.currentUser?.uid,
        appointment.barberId,
        appointment.id,
        appointment.servicePrice,
        `${appointment.serviceName} - ${appointment.barberName}`
      );

      if (result.success) {
        // Update local payment status
        setPaymentStatus({
          isPaid: true,
          amount: appointment.servicePrice,
          paidAt: new Date()
        });

        const paymentMessage = result.demo 
          ? `Demo payment of $${appointment.servicePrice?.toFixed(2)} has been processed successfully. (Backend not configured - this is simulation mode)`
          : `Payment of $${appointment.servicePrice?.toFixed(2)} has been processed successfully.`;

        Alert.alert(
          'Payment Successful',
          paymentMessage,
          [{ text: 'OK' }]
        );
      } else if (result.canceled) {
        // User canceled the payment
        console.log('Payment was canceled by user');
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      let errorMessage = 'There was an error processing your payment. Please try again.';
      
      // Handle specific error cases
      if (error.message.includes('backend call') || error.message.includes('configuration')) {
        errorMessage = 'Payment system is not fully configured. Using demo mode.';
      } else if (error.message.includes('secret format')) {
        errorMessage = 'Payment configuration error. Using demo payment instead.';
      }
      
      Alert.alert('Payment Notice', errorMessage);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const scheduleReminder = async () => {
    if (!appointment) return;
    try {
      // Debug logs for date/time conversion
      console.log('DEBUG appointment.date:', appointment.date);
      console.log('DEBUG appointment.time:', appointment.time);
      console.log('DEBUG to24Hour(appointment.time):', to24Hour(appointment.time));

      let appointmentDate;
      try {
        appointmentDate = getAppointmentDate(appointment.date, appointment.time);
        console.log('DEBUG getAppointmentDate result:', appointmentDate);
      } catch (err) {
        console.error('DEBUG getAppointmentDate error:', err);
        Alert.alert('Error', 'Invalid date or time format.');
        return;
      }
      setProcessing(true);
      await scheduleAppointmentReminder(appointment);
      setReminderSet(true);
      Alert.alert('Success', 'Reminder set.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not set reminder.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading appointment details...</Text>
      </View>
    );
  }

  if (error || !appointment) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
        <Text style={styles.errorText}>{error || 'Missing appointment data.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Appointment Details</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="person" size={20} color="#555" />
          <Text style={styles.label}>Barber:</Text>
          <Text style={styles.value}>{appointment.barberName}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="cut" size={20} color="#555" />
          <Text style={styles.label}>Service:</Text>
          <Text style={styles.value}>{appointment.serviceName}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="calendar" size={20} color="#555" />
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{formatDate(appointment.date)}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="time" size={20} color="#555" />
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>{appointment.time}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="pricetag" size={20} color="#555" />
          <Text style={styles.label}>Price:</Text>
          <Text style={styles.value}>${appointment.servicePrice?.toFixed(2) || 'N/A'}</Text>
        </View>
        
        {/* Payment Status Row */}
        <View style={styles.row}>
          <Ionicons 
            name={paymentStatus.isPaid ? "checkmark-circle" : "card"} 
            size={20} 
            color={paymentStatus.isPaid ? "#4CAF50" : "#555"} 
          />
          <Text style={styles.label}>Payment:</Text>
          <Text style={[styles.value, paymentStatus.isPaid && styles.paidText]}>
            {paymentStatus.isPaid ? 'Paid' : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, calendarAdded && styles.disabled]}
          onPress={handleAddToCalendar}
          disabled={processing || calendarAdded}
        >
          <Text style={styles.buttonText}>
            {calendarAdded ? 'Added to Calendar' : 'Add to Calendar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, reminderSet && styles.disabled]}
          onPress={handleSetReminder}
          disabled={processing || reminderSet}
        >
          <Text style={styles.buttonText}>
            {reminderSet ? 'Reminder Set' : 'Set Reminder'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payment Section */}
      {!paymentStatus.isPaid && appointment.servicePrice > 0 && (
        <View style={styles.paymentSection}>
          <TouchableOpacity 
            style={[styles.payButton, paymentProcessing && styles.disabledPayment]} 
            onPress={handlePayForService}
            disabled={paymentProcessing}
          >
            <Ionicons name="card" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.payButtonText}>
              {paymentProcessing ? 'Processing...' : `Pay $${appointment.servicePrice?.toFixed(2)}`}
            </Text>
          </TouchableOpacity>
          <Text style={styles.paymentHint}>Pay after service is completed</Text>
        </View>
      )}

      {paymentStatus.isPaid && (
        <View style={styles.paidSection}>
          <View style={styles.paidIndicator}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.paidText}>Payment Completed</Text>
          </View>
          <Text style={styles.paidAmount}>
            ${paymentStatus.amount?.toFixed(2)} paid on {paymentStatus.paidAt ? new Date(paymentStatus.paidAt.toDate?.() || paymentStatus.paidAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.cancelButton, processing && styles.disabledCancel]} 
        onPress={handleCancelAppointment}
        disabled={processing}
      >
        <Text style={styles.cancelText}>
          {processing ? 'Cancelling...' : 'Cancel Appointment'}
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

function to24Hour(timeStr) {
  // Replace all unicode and normal spaces with a single space, then trim
  if (!timeStr) return '';
  timeStr = String(timeStr).replace(/[\u202F\u00A0\u2009\u2007\u200A\u200B\u200C\u200D\uFEFF\s]+/g, ' ').trim();
  const parts = timeStr.split(' ');
  const time = parts[0];
  const modifier = parts[1] ? parts[1].toUpperCase() : '';
  if (!time) return '';
  let [hours, minutes] = time.split(':');
  hours = hours.padStart(2, '0'); // Ensure two digits
  if (modifier === 'PM' && hours !== '12') {
    hours = String(parseInt(hours, 10) + 12).padStart(2, '0');
  }
  if (modifier === 'AM' && hours === '12') {
    hours = '00';
  }
  return `${hours}:${minutes ? minutes.padStart(2, '0') : '00'}`;
}

function getAppointmentDate(dateStr, timeStr) {
  // Defensive: sanitize time string
  let time24 = to24Hour(timeStr);
  if (/^\d{2}:\d{2}$/.test(time24)) {
    time24 += ':00';
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
  if (!dateRegex.test(dateStr) || !timeRegex.test(time24)) {
    console.error('Invalid date or time format', { dateStr, timeStr, time24 });
    throw new Error('Invalid date or time format');
  }
  // Split date and time into parts
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes, seconds] = time24.split(':').map(Number);
  if (
    isNaN(year) || isNaN(month) || isNaN(day) ||
    isNaN(hours) || isNaN(minutes) || (seconds !== undefined && isNaN(seconds))
  ) {
    console.error('Date or time contains NaN', { year, month, day, hours, minutes, seconds });
    throw new RangeError('Date value out of bounds');
  }
  // JS Date: months are 0-based
  const dateObj = new Date(year, month - 1, day, hours, minutes, seconds || 0);
  if (isNaN(dateObj.getTime())) {
    console.error('Constructed date is invalid', { year, month, day, hours, minutes, seconds });
    throw new RangeError('Date value out of bounds');
  }
  return dateObj;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  errorText: { color: '#f44336', textAlign: 'center', margin: 10 },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 6,
  },
  retryButtonText: { color: '#fff', fontWeight: 'bold' },
  header: { padding: 20, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 22, fontWeight: 'bold' },
  card: { padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  label: { marginLeft: 8, fontWeight: 'bold', width: 80 },
  value: { flex: 1 },
  paidText: { color: '#4CAF50', fontWeight: 'bold' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', margin: 16 },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    width: '45%',
    alignItems: 'center',
  },
  disabled: { backgroundColor: '#4CAF50' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  buttonIcon: { marginRight: 8 },
  paymentSection: {
    margin: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
  },
  payButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    width: '100%',
    marginBottom: 8,
  },
  disabledPayment: { backgroundColor: '#999' },
  payButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
    marginLeft: 8 
  },
  paymentHint: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  paidSection: {
    margin: 20,
    padding: 16,
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    alignItems: 'center',
  },
  paidIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paidAmount: {
    color: '#666',
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    padding: 14,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledCancel: { backgroundColor: '#999' },
  cancelText: { color: '#fff', fontWeight: 'bold' },
});

export default AppointmentDetailsScreen;
