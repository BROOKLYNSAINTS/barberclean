import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { getUserProfile, updateUserProfile, auth } from '@/services/firebase';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

const BarberAvailabilityScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [unavailableDates, setUnavailableDates] = useState({});
  const [workingHours, setWorkingHours] = useState({
    start: '08:00',
    end: '17:00',
    interval: 30,
  });
  const [pickerState, setPickerState] = useState({
    mode: null, // 'start' | 'end' | null
    visible: false,
    tempDate: new Date(),
  });

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('User not authenticated.');
        router.replace('/(auth)/login');
        return;
      }
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
      if (userProfile.unavailableDates) setUnavailableDates(userProfile.unavailableDates);
      if (userProfile.workingHours) setWorkingHours(userProfile.workingHours);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load availability settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleDayPress = (day) => {
    setUnavailableDates((prev) => {
      const copy = { ...prev };
      if (copy[day.dateString]) {
        delete copy[day.dateString];
      } else {
        copy[day.dateString] = true;
      }
      return copy;
    });
  };

  const handleSaveAvailability = async () => {
    try {
      setSaving(true);
      setError('');
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated.');
        return;
      }
      await updateUserProfile(user.uid, { unavailableDates, workingHours });
      Alert.alert('Success', 'Availability settings saved successfully!');
    } catch (err) {
      console.error('Error saving availability:', err);
      setError('Failed to save availability settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTimeChange = (type, value) => {
    setWorkingHours((prev) => ({ ...prev, [type]: value }));
  };

  const parseTimeToDate = (timeStr) => {
    const [hourStr, minuteStr] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hourStr, 10) || 0, parseInt(minuteStr, 10) || 0, 0, 0);
    return date;
  };

  const formatDateToTimeString = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const openTimePicker = (mode) => {
    const currentTime = mode === 'start' ? workingHours.start : workingHours.end;
    setPickerState({
      mode,
      visible: true,
      tempDate: parseTimeToDate(currentTime),
    });
  };

  const handleTimePickerChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        setPickerState((prev) => ({ ...prev, visible: false, mode: null }));
        return;
      }
      if (selectedDate) {
        const timeString = formatDateToTimeString(selectedDate);
        if (pickerState.mode === 'start') {
          handleTimeChange('start', timeString);
        } else if (pickerState.mode === 'end') {
          handleTimeChange('end', timeString);
        }
      }
      setPickerState((prev) => ({ ...prev, visible: false, mode: null }));
    } else {
      // iOS: live update while keeping picker open
      if (selectedDate) {
        const timeString = formatDateToTimeString(selectedDate);
        if (pickerState.mode === 'start') {
          handleTimeChange('start', timeString);
        } else if (pickerState.mode === 'end') {
          handleTimeChange('end', timeString);
        }
        setPickerState((prev) => ({ ...prev, tempDate: selectedDate }));
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading availability settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 20 }]}>
          <Text style={styles.title}>Set Your Availability</Text>
          <Text style={styles.subtitle}>Manage when you're available for appointments</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Unavailable Dates</Text>
          <Text style={styles.sectionDescription}>Tap dates when you're NOT available</Text>
          <Calendar
            markedDates={Object.keys(unavailableDates).reduce((acc, date) => {
              acc[date] = {
                selected: true,
                selectedColor: '#FF4136',
                selectedTextColor: 'white',
              };
              return acc;
            }, {})}
            onDayPress={handleDayPress}
            pastScrollRange={12}
            futureScrollRange={12}
            theme={{
              selectedDayBackgroundColor: '#FF4136',
              todayTextColor: '#007BFF',
              arrowColor: '#007BFF',
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#b6c1cd',
            }}
            style={styles.calendar}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Working Hours</Text>
          <Text style={styles.sectionDescription}>Set your daily working schedule</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity
              onPress={() => openTimePicker('start')}
              style={styles.timeButton}
            >
              <Text style={styles.timeLabel}>Start Time</Text>
              <Text style={styles.timeValue}>{workingHours.start}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openTimePicker('end')}
              style={styles.timeButton}
            >
              <Text style={styles.timeLabel}>End Time</Text>
              <Text style={styles.timeValue}>{workingHours.end}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {pickerState.visible && pickerState.mode && (
          <DateTimePicker
            value={pickerState.tempDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimePickerChange}
          />
        )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveAvailability}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Availability Settings'}
          </Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
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
    backgroundColor: '#f0f2f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  calendar: {
    borderRadius: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007BFF',
  },
  saveButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#6c757d',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  errorText: {
    color: '#721c24',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default BarberAvailabilityScreen;
