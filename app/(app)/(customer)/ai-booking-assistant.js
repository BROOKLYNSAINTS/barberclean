import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { assistWithAppointmentBooking } from '@/services/openai'; // Adjusted path
//import { getBarberAvailability, auth } from '@/services/firebase'; // Adjusted path
import { getBarberAvailability, createAppointment, getUserProfile } from '@/services/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';

const AIBookingAssistantScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const barber = params.barber ? JSON.parse(params.barber) : null;
  const service = params.service ? JSON.parse(params.service) : null;
  
  const [userInput, setUserInput] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loading, setLoading] = useState(false); // For fetching slots
  const [processingRequest, setProcessingRequest] = useState(false); // For AI request
  const [error, setError] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState(null);

  useEffect(() => {
    if (!barber || !service) {
      setError('Barber or service information is missing.');
      setLoading(false);
      return;
    }
    if (selectedDate && barber.id) {
      fetchAvailableSlots();
    }
  }, [selectedDate, barber, service]);

  const fetchAvailableSlots = async () => {
    if (!barber || !barber.id) {
        setError("Barber ID is missing.");
        setLoading(false);
        return;
    }
    try {
      setLoading(true);
      setError('');
      const slots = await getBarberAvailability(barber.id, selectedDate);
      setAvailableSlots(slots);
      if (slots.length === 0 && selectedDate) {
        setError('No available slots for this date');
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setError('Failed to load available time slots');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedSlot('');
    setAiSuggestion(null);
    setError(''); // Clear previous errors
  };

  const handleTimeSelect = (time) => {
    setSelectedSlot(time);
  };

  const handleAskAI = async () => {
    if (!userInput.trim()) {
      Alert.alert('Input Required', 'Please enter your preferences first.');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Date Required', 'Please select a date before asking AI.');
      return;
    }
    if (loading) {
        Alert.alert('Loading', 'Please wait for available slots to load.');
        return;
    }
    if (availableSlots.length === 0) {
      Alert.alert('No Slots', 'No available slots for the selected date to suggest from.');
      return;
    }

    try {
      setProcessingRequest(true);
      setError('');
      setAiSuggestion(null);
      
      const result = await assistWithAppointmentBooking(userInput, availableSlots);
      
      if (result.success) {
        setAiSuggestion(result);
        if (result.suggestedTime && availableSlots.includes(result.suggestedTime)) {
          setSelectedSlot(result.suggestedTime);
        }
      } else {
        setError(result.error || 'AI could not find a suitable slot. Please try selecting manually or rephrasing.');
      }
    } catch (error) {
      console.error('Error processing AI booking request:', error);
      setError('An error occurred while asking AI. Please try again.');
    } finally {
      setProcessingRequest(false);
    }
  };

const handleContinue = async () => {
  if (!selectedDate || !selectedSlot) {
    Alert.alert('Selection Required', 'Please select both date and time for your appointment.');
    return;
  }
  if (!barber || !service) {
    Alert.alert('Error', 'Barber or Service details are missing.');
    return;
  }

  try {
    const customerId = auth.currentUser?.uid;
    if (!customerId) {
      Alert.alert('Error', 'User not logged in.');
      return;
    }

    const customerProfile = await getUserProfile(customerId);

    await createAppointment({
      customerId,
      customerName: customerProfile?.name || 'Unknown',
      barberId: barber.id,
      barberName: barber.name,
      serviceId: service.id,
      serviceName: service.name,
      date: selectedDate,
      time: selectedSlot,
      price: service.price,
      duration: service.duration,
      createdAt: new Date().toISOString(),
    });

    Alert.alert('Success', 'Your appointment has been booked.');
    router.replace('/(app)/(customer)/appointments'); // or confirmation screen
  } catch (error) {
    console.error('❌ Failed to book appointment:', error);
    Alert.alert('Error', 'Failed to book appointment. Please try again.');
  }
};

  const generateDates = () => {
    const datesArray = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = date.getDate();
      datesArray.push({ dateString, dayName, dayNumber });
    }
    return datesArray;
  };

  const dates = generateDates();

  // Add this utility function near the top or with your helpers:
  const safeFormatDate = (dateString, options = { weekday: 'short', month: 'short', day: 'numeric' }) => {
    if (!dateString || typeof dateString !== 'string' || !dateString.includes('-')) return 'N/A';
    const [year, month, day] = dateString.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return 'N/A';
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString(undefined, options);
  };

  if (!barber || !service) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
        <Text style={styles.errorText}>{error || 'Barber or service data is missing.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Booking Assistant</Text>
          <Text style={styles.subtitle}>
            Tell us your preferences, and our AI will help you find the perfect appointment time.
          </Text>
        </View>

        <View style={styles.serviceInfoCard}>
          <Text style={styles.serviceInfoTitle}>Booking For</Text>
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

        <View style={styles.dateSelectionSection}>
          <Text style={styles.sectionTitle}>1. Select a Date</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.datesContainer}
          >
            {dates.map((date) => (
              <TouchableOpacity
                key={date.dateString}
                style={[
                  styles.dateOption,
                  selectedDate === date.dateString && styles.selectedDateOption
                ]}
                onPress={() => handleDateSelect(date.dateString)}
              >
                <Text style={[
                  styles.dayName,
                  selectedDate === date.dateString && styles.selectedDateText
                ]}>
                  {date.dayName}
                </Text>
                <Text style={[
                  styles.dayNumber,
                  selectedDate === date.dateString && styles.selectedDateText
                ]}>
                  {date.dayNumber}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedDate && (
          <View style={styles.aiInputSection}>
            <Text style={styles.sectionTitle}>2. Tell AI Your Preferences (Optional)</Text>
            <Text style={styles.sectionSubtitle}>
              e.g., "afternoon", "not too early", "around lunch time"
            </Text>
            <TextInput
              style={styles.preferenceInput}
              value={userInput}
              onChangeText={setUserInput}
              placeholder="Enter your time preferences..."
              multiline
            />
            <TouchableOpacity 
              style={[styles.askAiButton, (processingRequest || loading || availableSlots.length === 0) && styles.disabledButton]}
              onPress={handleAskAI}
              disabled={processingRequest || loading || availableSlots.length === 0}
            >
              {processingRequest ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="bulb-outline" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.askAiButtonText}>Ask AI for Suggestions</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {selectedDate && (
          <View style={styles.timeSelectionSection}>
            <Text style={styles.sectionTitle}>3. Select an Available Time</Text>
            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="small" color="#2196F3" />
                <Text style={styles.loadingText}>Loading available times...</Text>
              </View>
            ) : error && availableSlots.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : availableSlots.length === 0 && !error ? (
              <View style={styles.centered}>
                <Text style={styles.noSlotsText}>No available slots for this date.</Text>
              </View>
            ) : (
              <>
                {aiSuggestion && (
                  <View style={styles.aiSuggestionContainer}>
                    <View style={styles.aiSuggestionHeader}>
                      <Ionicons name="bulb-outline" size={20} color="#1976D2" />
                      <Text style={styles.aiSuggestionTitle}>AI Suggestion:</Text>
                    </View>
                    <Text style={styles.aiSuggestionText}>{aiSuggestion.explanation}</Text>
                  </View>
                )}
                <View style={styles.timeSlotsContainer}>
                  {availableSlots.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeSlot,
                        selectedSlot === time && styles.selectedTimeSlot,
                        aiSuggestion?.suggestedTime === time && styles.suggestedTimeSlot
                      ]}
                      onPress={() => handleTimeSelect(time)}
                    >
                      <Text style={[
                        styles.timeSlotText,
                        selectedSlot === time && styles.selectedTimeSlotText
                      ]}>
                        {time}
                      </Text>
                      {aiSuggestion?.suggestedTime === time && (
                        <Ionicons name="star" size={12} color="#FFC107" style={styles.starIcon} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedDate || !selectedSlot || loading || processingRequest) && styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={!selectedDate || !selectedSlot || loading || processingRequest}
        >
          <Text style={styles.continueButtonText}>Continue to Booking</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  serviceInfoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  serviceInfoTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  serviceInfoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  serviceInfoLabel: {
    fontWeight: '500',
    width: 70,
    color: '#444',
  },
  serviceInfoValue: {
    flex: 1,
    color: '#666',
  },
  dateSelectionSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  datesContainer: {
    paddingBottom: 10, // For shadow visibility if any
  },
  dateOption: {
    width: 65,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedDateOption: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  dayName: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedDateText: {
    color: '#fff',
  },
  aiInputSection: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  preferenceInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
    backgroundColor: '#fdfdfd',
  },
  askAiButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  askAiButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timeSelectionSection: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    fontSize: 14,
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
  noSlotsText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
  aiSuggestionContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  aiSuggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiSuggestionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976D2',
    marginLeft: 6,
  },
  aiSuggestionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeSlot: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 15,
    margin: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  suggestedTimeSlot: {
    borderColor: '#FFC107',
    borderWidth: 2,
    backgroundColor: '#FFF9C4',
  },
  timeSlotText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
  },
  selectedTimeSlotText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  starIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
});
export default AIBookingAssistantScreen;

