// app/(app)/(customer)/index.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, getCustomerAppointments } from '@/services/firebase';

export default function IndexScreen() {
  const router = useRouter();
  const [zipcode, setZipcode] = useState('');
  const [previousBarber, setPreviousBarber] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreviousAppointment();
  }, []);

  const loadPreviousAppointment = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const appointments = await getCustomerAppointments(user.uid);
        
        console.log('📋 All appointments:', appointments);
        
        // Filter out cancelled appointments and get the most recent one
        const activeAppointments = appointments.filter(apt => apt.status !== 'cancelled');
        
        console.log('📋 Active appointments:', activeAppointments);
        
        if (activeAppointments.length > 0) {
          // Sort by date and get the most recent
          activeAppointments.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateB - dateA;
          });
          
          const lastAppointment = activeAppointments[0];
          console.log('📋 Last appointment data:', lastAppointment);
          
          // Check what data we actually have
          const hasRequiredData = lastAppointment.barberId && 
                                 lastAppointment.barberName && 
                                 lastAppointment.serviceName;
          
          if (hasRequiredData) {
            setPreviousBarber({
              barberId: lastAppointment.barberId,
              barberName: lastAppointment.barberName,
              serviceName: lastAppointment.serviceName,
              servicePrice: lastAppointment.servicePrice || 0,
              serviceDuration: lastAppointment.serviceDuration || 30,
              serviceId: lastAppointment.serviceId || 'default'
            });
            console.log('✅ Previous barber data set successfully');
          } else {
            console.log('❌ Missing required appointment data:', {
              barberId: lastAppointment.barberId,
              barberName: lastAppointment.barberName,
              serviceName: lastAppointment.serviceName
            });
          }
        } else {
          console.log('📋 No active appointments found');
        }
      }
    } catch (error) {
      console.error('Error loading previous appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookWithPrevious = () => {
    if (previousBarber) {
      console.log('🚀 Navigating to booking with previous barber:', previousBarber);
      
      // Navigate to barber selection if we don't have service details
      if (!previousBarber.serviceId || previousBarber.serviceId === 'default') {
        console.log('📍 Going to barber services (missing service details)');
        
        // Create barber object in the format expected by barber-services
        const barberObj = {
          id: previousBarber.barberId,
          name: previousBarber.barberName,
          // Add any other barber fields that might be needed
        };
        
        router.push({
          pathname: '/(app)/(customer)/barber-services',
          params: {
            barber: JSON.stringify(barberObj),
            fromPrevious: 'true'
          },
        });
      } else {
        console.log('📍 Going directly to appointment booking (complete data)');
        // Navigate directly to appointment booking with pre-filled data
        
        // Create barber and service objects in the format expected by appointment booking
        const barberObj = {
          id: previousBarber.barberId,
          name: previousBarber.barberName,
          // Add any other barber fields that might be needed
        };
        
        const serviceObj = {
          id: previousBarber.serviceId,
          name: previousBarber.serviceName,
          price: previousBarber.servicePrice,
          duration: previousBarber.serviceDuration,
        };
        
        router.push({
          pathname: '/(app)/(customer)/appointment-booking',
          params: {
            barber: JSON.stringify(barberObj),
            service: JSON.stringify(serviceObj),
            fromPrevious: 'true'
          },
        });
      }
    }
  };

  const handleSubmit = () => {
    if (zipcode.length === 5) {
      router.push({
        pathname: '/(app)/(customer)/barber-selection',
        params: { zipcode },
      });
    } else {
      alert('Please enter a valid 5-digit ZIP code');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Welcome to ScheduleSync</Text>
          <Text style={styles.subtitle}>Book your next appointment</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
          ) : (
            <>
              {/* Previous Barber Option */}
              {previousBarber && (
                <View style={styles.previousSection}>
                  <Text style={styles.previousTitle}>Book with Previous Barber</Text>
                  <TouchableOpacity style={styles.previousButton} onPress={handleBookWithPrevious}>
                    <View style={styles.previousContent}>
                      <Ionicons name="person" size={24} color="#2196F3" />
                      <View style={styles.previousText}>
                        <Text style={styles.previousBarber}>{previousBarber.barberName}</Text>
                        {previousBarber.serviceName ? (
                          <>
                            <Text style={styles.previousService}>{previousBarber.serviceName}</Text>
                            {previousBarber.servicePrice > 0 && (
                              <Text style={styles.previousPrice}>${previousBarber.servicePrice?.toFixed(2)}</Text>
                            )}
                          </>
                        ) : (
                          <Text style={styles.previousService}>Choose service</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#2196F3" />
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </View>
              )}
              
              {/* New Search Section */}
              <View style={styles.searchSection}>
                <Text style={styles.searchTitle}>Find a New Barber</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter ZIP Code"
                  value={zipcode}
                  onChangeText={setZipcode}
                  keyboardType="numeric"
                  maxLength={5}
                />
                <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                  <Ionicons name="search" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Search Barbers</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 40,
  },
  previousSection: {
    marginBottom: 32,
  },
  previousTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  previousButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  previousContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previousText: {
    flex: 1,
    marginLeft: 12,
  },
  previousBarber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  previousService: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  previousPrice: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  searchSection: {
    alignItems: 'center',
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
});
