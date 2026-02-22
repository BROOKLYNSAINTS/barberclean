// app/(auth)/profile-setup.js

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';

import { db } from '@/services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { createSubscriptionPaymentSheet, useStripe } from '@/services/stripe';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const stripe = useStripe();
  const { userId, email } = useLocalSearchParams();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [isBarber, setIsBarber] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* -----------------------------------------
   * BARBER SUBSCRIPTION
   * ----------------------------------------- */
  const handleBarberSubscription = async () => {
    if (!stripe) return false;

    const PRICE_ID =
      Constants.expoConfig?.extra?.stripeSubscriptionPriceId ||
      process.env.EXPO_PUBLIC_STRIPE_SUBSCRIPTION_PRICE_ID;

    if (!PRICE_ID) return false;

    const result = await createSubscriptionPaymentSheet(
      stripe,
      userId,
      PRICE_ID,
      email
    );

    if (!result?.success) return false;

    if (result.onboardingUrl) {
      await Linking.openURL(result.onboardingUrl);
    }

    return true;
  };

  /* -----------------------------------------
   * SAVE PROFILE (SAFE)
   * ----------------------------------------- */
  const handleSaveProfile = async () => {
    try {
      if (!name || !phone || !address || !zipcode) {
        setError('All fields are required.');
        return;
      }

      setLoading(true);
      setError('');

      if (isBarber) {
        const ok = await handleBarberSubscription();
        if (!ok) {
          setLoading(false);
          return;
        }
      }

      const userRef = doc(db, 'users', userId);

      const payload = {
        name,
        phone,
        address,
        zipcode,
        role: isBarber ? 'barber' : 'customer',
        userType: isBarber ? 'barber' : 'customer',
        updatedAt: serverTimestamp(),
      };

      if (isBarber) {
        payload.noShowSettings = {
          enabled: true,
          feeType: 'flat',
          feeAmount: 25,
          cancellationWindowHours: 24,
          updatedAt: new Date().toISOString(),
        };

        payload.metrics = {
          recoveredRevenue: 0,
        };
      }

      // ✅ UPDATE ONLY — NEVER overwrite Stripe fields
      await updateDoc(userRef, payload);

      router.replace(
        isBarber ? '/(app)/(barber)/dashboard' : '/(app)/(customer)/'
      );
    } catch (err) {
      Alert.alert('Profile Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------------------
   * UI
   * ----------------------------------------- */
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile Setup</Text>

        <TextInput
          style={styles.input}
          placeholder="Business / Full Name"
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

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>I am a barber</Text>
          <Switch value={isBarber} onValueChange={setIsBarber} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSaveProfile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? 'Processing...'
              : isBarber
              ? 'Subscribe & Continue'
              : 'Save Profile'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* -----------------------------------------
 * STYLES
 * ----------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  switchLabel: { flex: 1, fontSize: 16 },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  error: { color: 'red', textAlign: 'center', marginBottom: 12 },
});
