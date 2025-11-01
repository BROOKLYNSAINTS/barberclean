import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { getUserProfile, updateUserProfile, auth } from '@/services/firebase';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; // Add this import

const BarberAvailabilityScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // Add this hook
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [unavailableDates, setUnavailableDates] = useState({});
  const [workingHours, setWorkingHours] = useState({ start: '08:00', end: '17:00', interval: 30 });

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
  }, []);

  const handleDayPress = (day) => {
    const newDates = { ...unavailableDates };
    if (newDates[day.dateString]) {
      delete newDates[day.dateString];
    } else {
      newDates[day.dateString] = { disabled: true, disableTouchEvent: true };
    }
    setUnavailableDates(newDates);
  };

  const handleSaveAvailability = async () => {
    try {
      setSaving(true);
      setError('');
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not authenticated.");
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
    setWorkingHours(prev => ({ ...prev, [type]: value }));
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
            markedDates={{
              ...unavailableDates,
              // Add styling for marked dates
              ...Object.keys(unavailableDates).reduce((acc, date) => {
                acc[date] = {
                  ...unavailableDates[date],
                  color: '#FF4136',
                  textColor: 'white',
                  selected: true,
                  selectedColor: '#FF4136'
                };
                return acc;
              }, {})
            }}
            onDayPress={handleDayPress}
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
              onPress={() => handleTimeChange('start', workingHours.start === '08:00' ? '09:00' : '08:00')} 
              style={styles.timeButton}
            >
              <Text style={styles.timeLabel}>Start Time</Text>
              <Text style={styles.timeValue}>{workingHours.start}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => handleTimeChange('end', workingHours.end === '17:00' ? '18:00' : '17:00')} 
              style={styles.timeButton}
            >
              <Text style={styles.timeLabel}>End Time</Text>
              <Text style={styles.timeValue}>{workingHours.end}</Text>
            </TouchableOpacity>
          </View>
        </View>

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
