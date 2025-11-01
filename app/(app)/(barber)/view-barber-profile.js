import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getUserProfile } from '@/services/firebase';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const ViewBarberProfile = () => {
  const { barberId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBarber = async () => {
      try {
        console.log('🔍 Fetching barber profile for ID:', barberId);
        
        if (!barberId) {
          setError('You Need to select a barber from the Network tab then I can display the profile');
          setLoading(false);
          return;
        }

        const data = await getUserProfile(barberId);
        console.log('👤 Barber profile data:', data);
        
        if (!data) {
          setError('Barber profile not found');
        } else {
          setBarber(data);
        }
      } catch (err) {
        console.error('❌ Error fetching barber profile:', err);
        setError('Failed to load barber profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchBarber();
  }, [barberId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 20 }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007BFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Barber Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Loading barber profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 20 }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007BFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Barber Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
          <Text style={styles.errorTitle}>Profile Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setError('');
              // Retry loading
              const fetchBarber = async () => {
                try {
                  const data = await getUserProfile(barberId);
                  setBarber(data);
                } catch (err) {
                  setError('Failed to load barber profile.');
                } finally {
                  setLoading(false);
                }
              };
              fetchBarber();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!barber) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 20 }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007BFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Barber Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="person-circle-outline" size={64} color="#ccc" />
          <Text style={styles.errorTitle}>Barber Not Found</Text>
          <Text style={styles.errorText}>This barber profile could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 20 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Barber Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={80} color="#007BFF" />
          </View>
          
          <Text style={styles.name}>{barber.name || 'Unknown Barber'}</Text>
          <Text style={styles.subtitle}>
            {barber.shopName || 'Independent Barber'}
          </Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>📍 Location & Contact</Text>
          
          {barber.address && (
            <View style={styles.detailRow}>
              <Ionicons name="home-outline" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.label}>Address</Text>
                <Text style={styles.text}>{barber.address}</Text>
              </View>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.label}>Zipcode</Text>
              <Text style={styles.text}>{barber.zipcode || 'Not specified'}</Text>
            </View>
          </View>

          {barber.phone && (
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.label}>Phone</Text>
                <Text style={styles.text}>{barber.phone}</Text>
              </View>
            </View>
          )}

          {barber.email && (
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.text}>{barber.email}</Text>
              </View>
            </View>
          )}
        </View>

        {(barber.specialties?.length > 0 || barber.yearsExperience !== undefined) && (
          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>✂️ Professional Info</Text>
            
            {barber.yearsExperience !== undefined && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <View style={styles.detailContent}>
                  <Text style={styles.label}>Experience</Text>
                  <Text style={styles.text}>{barber.yearsExperience} years</Text>
                </View>
              </View>
            )}

            {barber.specialties?.length > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="cut-outline" size={20} color="#666" />
                <View style={styles.detailContent}>
                  <Text style={styles.label}>Specialties</Text>
                  <Text style={styles.text}>{barber.specialties.join(', ')}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {barber.subscription?.status === 'active' && (
          <View style={styles.subscriptionCard}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.subscriptionText}>Verified Professional Barber</Text>
          </View>
        )}

        <Text style={styles.debugText}>
          Debug - Barber ID: {barberId}
        </Text>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
  subscriptionCard: {
    backgroundColor: '#e8f5e8',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  subscriptionText: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '600',
    marginLeft: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ViewBarberProfile;
