import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { createUserProfile } from '@/services/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createSubscriptionPaymentSheet } from '@/services/stripe';

const ProfileSetupScreen = () => {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [isBarber, setIsBarber] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBarberSubscription = async () => {
    try {
      setLoading(true);
      console.log('🔔 Creating barber subscription...');
      
      // Fixed with your actual price ID
      const BARBER_SUBSCRIPTION_PRICE_ID = 'price_1RK5IUIvx79ISETig1HxzVwK';
      
      const subscriptionResult = await createSubscriptionPaymentSheet(userId, BARBER_SUBSCRIPTION_PRICE_ID);
      
      if (subscriptionResult.success) {
        console.log('✅ Subscription created successfully');
        Alert.alert('Success!', 'Your barber subscription is now active. Welcome aboard!');
        return true;
      } else if (subscriptionResult.canceled) {
        Alert.alert('Setup Canceled', 'Subscription setup was canceled. You can set this up later in settings.');
        return false;
      } else {
        throw new Error('Subscription creation failed');
      }
      
    } catch (error) {
      console.error('❌ Subscription error:', error);
      Alert.alert('Subscription Error', 'Failed to create subscription. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!name || !phone || !address || !zipcode) {
        setError('Please fill in all required fields');
        return;
      }

      setLoading(true);
      setError('');

      // For barbers, handle subscription first
      if (isBarber) {
        const subscriptionSuccess = await handleBarberSubscription();
        if (!subscriptionSuccess) {
          setLoading(false);
          return;
        }
      }

      const userData = {
        name,
        phone,
        address,
        zipcode,
        role: isBarber ? 'barber' : 'customer',
        createdAt: new Date().toISOString(),
      };

      if (isBarber) {
        userData.subscription = {
          status: 'active',
          plan: 'barber_monthly',
          startDate: new Date().toISOString(),
          amount: 30,
          currency: 'usd',
        };
      }

      await createUserProfile(userId, userData);
      
      if (isBarber) {
        router.replace('/(app)/(barber)/dashboard');
      } else {
        router.replace('/(app)/(customer)/');
      }
    } catch (error) {
      console.error('Profile setup error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Complete Your Profile</Text>
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your address"
          value={address}
          onChangeText={setAddress}
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Zipcode</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your zipcode"
          value={zipcode}
          onChangeText={setZipcode}
          keyboardType="numeric"
        />
      </View>
      
      <View style={styles.switchContainer}>
        <Text style={styles.label}>I am a Barber</Text>
        <Switch
          value={isBarber}
          onValueChange={setIsBarber}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isBarber ? '#2196F3' : '#f4f3f4'}
        />
      </View>
      
      {isBarber && (
        <View style={styles.barberSection}>
          <Text style={styles.sectionTitle}>Barber Subscription</Text>
          <Text style={styles.sectionSubtitle}>
            $30/month - Secure payment via Stripe
          </Text>
          <Text style={styles.featuresText}>
            ✅ Accept appointments{'\n'}
            ✅ Manage your schedule{'\n'}
            ✅ Receive payments{'\n'}
            ✅ Chat with barbers{'\n'}
            ✅ Message Board
          </Text>
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleSaveProfile}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? (isBarber ? 'Setting up subscription...' : 'Saving...') : (isBarber ? 'Subscribe & Continue' : 'Save Profile')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// Update styles to remove credit card fields
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  barberSection: {
    marginTop: 10,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  featuresText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default ProfileSetupScreen;

