import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Linking } from 'react-native';
import { createUserProfile } from '@/services/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createSubscriptionPaymentSheet, useStripe } from '@/services/stripe';
import Constants from 'expo-constants';

const ProfileSetupScreen = () => {
  const router = useRouter();
  const { userId, email } = useLocalSearchParams();
  const stripe = useStripe();
  
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

      // Ensure Stripe hook is initialized
      if (!stripe) {
        Alert.alert('Stripe error', 'Stripe is not initialized in this build.');
        return false;
      }

      const BARBER_SUBSCRIPTION_PRICE_ID =
        Constants.expoConfig?.extra?.stripeSubscriptionPriceId ||
        process.env.EXPO_PUBLIC_STRIPE_SUBSCRIPTION_PRICE_ID;

      if (!BARBER_SUBSCRIPTION_PRICE_ID) {
        console.error('Missing Stripe price ID');
        Alert.alert(
          'Configuration Error',
          'Stripe subscription price ID is not configured for this build.'
        );
        return false;
      }

      console.log('💳 Using Stripe Price ID:', BARBER_SUBSCRIPTION_PRICE_ID);
      console.log('📧 User email:', email);

      const subscriptionResult = await createSubscriptionPaymentSheet(
        stripe,
        userId,
        BARBER_SUBSCRIPTION_PRICE_ID,
        email
      );
      
      if (subscriptionResult.success) {
        console.log('✅ Subscription created successfully');
        
        // If Connect onboarding URL is available, open it
        if (subscriptionResult.onboardingUrl) {
          console.log('🔗 Opening Stripe Connect onboarding...');
          Alert.alert(
            'Setup Bank Account',
            'To receive payments from customers, you need to complete your bank account setup with Stripe.',
            [
              {
                text: 'Setup Now',
                onPress: async () => {
                  try {
                    const supported = await Linking.canOpenURL(subscriptionResult.onboardingUrl);
                    if (supported) {
                      await Linking.openURL(subscriptionResult.onboardingUrl);
                    } else {
                      console.error('Cannot open URL:', subscriptionResult.onboardingUrl);
                      Alert.alert('Error', 'Unable to open bank setup. Please contact support.');
                    }
                  } catch (err) {
                    console.error('Error opening URL:', err);
                  }
                }
              },
              {
                text: 'Setup Later',
                style: 'cancel',
                onPress: () => {
                  Alert.alert('Success!', 'Your barber subscription is active. You can setup your bank account later in settings.');
                }
              }
            ]
          );
        } else {
          Alert.alert('Success!', 'Your barber subscription is now active. Welcome aboard!');
        }
        
        return true;
      } else if (subscriptionResult.canceled) {
        Alert.alert('Setup Canceled', 'Subscription setup was canceled. You can set this up later in settings.');
        return false;
      } else {
        throw new Error('Subscription creation failed');
      }
      
    } catch (error) {
      console.error('❌ Subscription error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      Alert.alert('Subscription Error', `Failed to create subscription: ${error.message}`);
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
      console.error('❌ Profile save error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      Alert.alert('Profile Error', `Failed to save profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Profile Setup</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Address"
          value={address}
          onChangeText={setAddress}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Zip Code"
          value={zipcode}
          onChangeText={setZipcode}
          keyboardType="numeric"
        />
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Are you a barber?</Text>
          <Switch
            value={isBarber}
            onValueChange={setIsBarber}
            thumbColor={isBarber ? '#fff' : '#f4f3f4'}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
          />
        </View>

        {isBarber && (
          <View style={styles.barberSection}>
            <Text style={styles.sectionTitle}>Barber Subscription</Text>
            <Text style={styles.sectionSubtitle}>
              $30/month – Secure payment via Stripe
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
        
        {error ? <Text style={styles.error}>{error}</Text> : null}
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleSaveProfile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? (isBarber ? 'Setting up subscription...' : 'Saving...')
              : (isBarber ? 'Subscribe & Continue' : 'Save Profile')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  switchLabel: {
    flex: 1,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
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
});

export default ProfileSetupScreen;

