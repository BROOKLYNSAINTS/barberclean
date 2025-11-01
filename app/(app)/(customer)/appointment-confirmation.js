import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../src/contexts/AuthContext';
import { scheduleAppointmentReminder, scheduleTestReminder } from '../../../src/services/notifications';
import DebugUser from '@/components/DebugUser';

// ✅ Safe JSON parsing
const safeParse = (input) => {
  if (!input) return null;
  try {
    return typeof input === 'string' ? JSON.parse(input) : input;
  } catch (err) {
    return null;
  }
};

function to24Hour(timeStr) {
  // Replace all unicode spaces (including U+202F, \u00A0, etc.) with a normal space, then trim
  timeStr = timeStr.replace(/[\u202F\u00A0\s]+/g, ' ').trim();
  // Split by space to separate time and AM/PM
  const parts = timeStr.split(' ');
  const time = parts[0];
  const modifier = parts[1] ? parts[1].toUpperCase() : '';
  if (!time) return '';
  let [hours, minutes] = time.split(':');
  if (modifier === 'PM' && hours !== '12') {
    hours = String(parseInt(hours, 10) + 12);
  }
  if (modifier === 'AM' && hours === '12') {
    hours = '00';
  }
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

function getAppointmentDate(dateStr, timeStr) {
  const time24 = to24Hour(timeStr);
  // Validate date and time
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
  if (!dateRegex.test(dateStr) || !timeRegex.test(time24)) {
    throw new Error('Invalid date or time format');
  }
  return new Date(`${dateStr}T${time24}`);
}

// Set the notification handler with updated properties
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // shows a banner when the notification is received
    shouldShowList: true,   // shows in the notification center/list
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function AppointmentConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUser } = useAuth();

  const appointment = safeParse(params.appointment);
  const barber = safeParse(params.barber);
  const service = safeParse(params.service);

  const [loading, setLoading] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [autoRemindersSet, setAutoRemindersSet] = useState(false);

  // Automatically set up reminders when component mounts
  useEffect(() => {
    const setupAutomaticReminders = async () => {
      if (!appointment || !currentUser?.uid || autoRemindersSet) {
        console.log('⚠️ Skipping reminder setup:', { 
          hasAppointment: !!appointment, 
          hasUser: !!currentUser?.uid, 
          alreadySet: autoRemindersSet 
        });
        return;
      }
      
      try {
        console.log('🔔 Setting up automatic reminders...', { appointment, userId: currentUser.uid });
        await scheduleAppointmentReminder(appointment, currentUser.uid);
        setAutoRemindersSet(true);
        console.log('✅ Automatic reminders set successfully');
      } catch (error) {
        console.error('❌ Error setting automatic reminders:', error);
      }
    };

    setupAutomaticReminders();
  }, [appointment, currentUser, autoRemindersSet]);

  const formatDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string' || !dateString.includes('-')) return 'N/A';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    // Parse as local date to avoid UTC shift bug
    const [year, month, day] = dateString.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return 'N/A';
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString(undefined, options);
  };

  const addToCalendar = async () => {
    if (!appointment || !barber || !service) return;
    try {
      setLoading(true);
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Calendar permission is required.');
        setLoading(false);
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find((cal) => cal.allowsModifications) || calendars[0];
      if (!defaultCalendar) {
        Alert.alert('Error', 'No writable calendar found.');
        setLoading(false);
        return;
      }

      // Debug logs for date/time conversion
      console.log('DEBUG appointment.date:', appointment.date);
      console.log('DEBUG appointment.time:', appointment.time);
      console.log('DEBUG to24Hour(appointment.time):', to24Hour(appointment.time));

      let startDate;
      try {
        startDate = getAppointmentDate(appointment.date, appointment.time);
        console.log('DEBUG getAppointmentDate result:', startDate);
      } catch (err) {
        console.error('DEBUG getAppointmentDate error:', err);
        Alert.alert('Error', 'Invalid date or time format.');
        setLoading(false);
        return;
      }
      const endDate = new Date(startDate.getTime() + (service.duration || 30) * 60000);

      const eventDetails = {
        title: `Haircut: ${service.name} with ${barber.name}`,
        startDate,
        endDate,
        notes: `Appointment for ${service.name}. Price: $${(service.price || 0).toFixed(2)}`,
        location: barber.address,
        timeZone: Calendar.DEFAULT_CALENDAR_TIME_ZONE,
        alarms: [{ relativeOffset: -60 }],
      };

      await Calendar.createEventAsync(defaultCalendar.id, eventDetails);
      setCalendarAdded(true);
      Alert.alert('Success', 'Appointment added to your calendar.');
    } catch (error) {
      console.error('Error adding to calendar:', error);
      Alert.alert('Error', 'Failed to add appointment to calendar.');
    } finally {
      setLoading(false);
    }
  };

  const scheduleReminder = async () => {
    // This function is now deprecated since we do automatic reminders
    // Keeping for reference but not using
    Alert.alert(
      'Info', 
      'Reminders are automatically set when you book an appointment. Check your notification screen to see them!'
    );
  };

  const testReminder = async () => {
    try {
      console.log('🧪 Testing reminder in 10 seconds...');
      await scheduleTestReminder(appointment, currentUser.uid, 10);
      Alert.alert(
        'Test Reminder Scheduled', 
        'A test reminder will appear in 10 seconds. Make sure your app is in the background to see the notification!'
      );
    } catch (error) {
      console.error('Error scheduling test reminder:', error);
      Alert.alert('Error', 'Failed to schedule test reminder.');
    }
  };
  const handleDone = () => {
    router.replace({
      pathname: '/(app)/(customer)/appointment-details',
      params: {
        appointment: JSON.stringify(appointment),
        barber: JSON.stringify(barber),
        service: JSON.stringify(service),
      },
    });
  };

  if (!appointment || !barber || !service) {
    return (
      <View style={styles.centeredLoading}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>Loading confirmation...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <DebugUser screenName="Appointment Confirmation" />
      <View style={styles.confirmationCard}>
        <Ionicons name="checkmark-circle" size={64} color="#4CAF50" style={styles.confirmationIcon} />
        <Text style={styles.confirmationTitle}>Appointment Confirmed!</Text>
        <Text style={styles.confirmationSubtitle}>Your appointment has been successfully booked.</Text>
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Appointment Details</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Barber:</Text>
          <Text style={styles.detailValue}>{barber.name}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Service:</Text>
          <Text style={styles.detailValue}>{service.name}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>{formatDate(appointment.date)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>{appointment.time}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration:</Text>
          <Text style={styles.detailValue}>{service.duration || 30} minutes</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price:</Text>
          <Text style={styles.detailValue}>${(service.price || 0).toFixed(2)}</Text>
        </View>

        {barber.phone && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={styles.detailValue}>{barber.phone}</Text>
          </View>
        )}

        {barber.address && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{barber.address}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, calendarAdded && styles.disabledButtonGreen]}
          onPress={addToCalendar}
          disabled={loading || calendarAdded}
        >
          {loading && !calendarAdded ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="calendar-outline" size={20} color="#fff" style={styles.actionIcon} />
              <Text style={styles.actionButtonText}>
                {calendarAdded ? 'Added to Calendar' : 'Add to Calendar'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={[styles.actionButton, styles.disabledButtonGreen]}>
          <Ionicons name="notifications" size={20} color="#fff" style={styles.actionIcon} />
          <Text style={styles.actionButtonText}>
            {autoRemindersSet ? 'Reminders Set' : 'Setting Reminders...'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>

      {/* Test Button - Remove this in production */}
      <TouchableOpacity 
        style={[styles.doneButton, { backgroundColor: '#FF9800', marginTop: 8 }]} 
        onPress={testReminder}
      >
        <Text style={styles.doneButtonText}>🧪 Test Reminder (10 seconds)</Text>
      </TouchableOpacity>

      <Text style={styles.reminderInfoText}>
        Reminders are automatically set for 24 hours and 1 hour before your appointment. 
        You can view them in the notifications tab.
      </Text>

      <View style={{ padding: 10, backgroundColor: '#ffe' }}>
        <Text>Raw appointment.date: {String(appointment?.date)}</Text>
        <Text>Raw appointment.time: {String(appointment?.time)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centeredLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  confirmationCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  confirmationIcon: { marginBottom: 16 },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmationSubtitle: { fontSize: 16, color: '#666', textAlign: 'center' },
  detailsCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  detailLabel: { fontWeight: '500', width: 80, color: '#555' },
  detailValue: { flex: 1, color: '#333' },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  disabledButtonGreen: { backgroundColor: '#4CAF50' },
  actionIcon: { marginRight: 8 },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: '#0288D1',
    paddingVertical: 15,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  reminderInfoText: {
    textAlign: 'center',
    color: '#666',
    marginHorizontal: 16,
    marginBottom: 24,
    fontSize: 13,
  },
});
