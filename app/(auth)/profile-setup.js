// app/(auth)/profile-setup.js

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';

import { useRouter, useLocalSearchParams } from 'expo-router';

import { db } from '@/services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function ProfileSetupScreen() {

  const router = useRouter();
  const { userId } = useLocalSearchParams();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [zipcode, setZipcode] = useState('');

  const [selectedRole, setSelectedRole] = useState('customer');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSaveProfile = async () => {

    try {

      if (!name || !phone || !address || !zipcode) {
        setError('All fields are required.');
        return;
      }

      setLoading(true);
      setError('');

      const userRef = doc(db, 'users', userId);

      const payload = {
        name,
        phone,
        address,
        zipcode,
        role: selectedRole,
        userType: selectedRole,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userRef, payload);

      // If barber → go to subscription screen
      if (selectedRole === 'barber') {

        router.push({
          pathname: '/(auth)/barber-subscription',
          params: { userId }
        });

      } else {

        router.replace('/(app)/(customer)/');

      }

    } catch (err) {

      Alert.alert('Profile Error', err.message);

    } finally {

      setLoading(false);

    }

  };

  return (

    <View style={styles.container}>

      <ScrollView contentContainerStyle={styles.scroll}>

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

        <Text style={styles.roleTitle}>Account Type</Text>

        <View style={styles.roleContainer}>

          <TouchableOpacity
            style={[
              styles.roleButton,
              selectedRole === 'customer' && styles.roleSelected
            ]}
            onPress={() => setSelectedRole('customer')}
          >
            <Text style={styles.roleText}>Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleButton,
              selectedRole === 'barber' && styles.roleSelected
            ]}
            onPress={() => setSelectedRole('barber')}
          >
            <Text style={styles.roleText}>Barber</Text>
          </TouchableOpacity>

        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSaveProfile}
          disabled={loading}
        >

          <Text style={styles.buttonText}>
            {loading ? 'Processing...' : 'Save Profile'}
          </Text>

        </TouchableOpacity>

      </ScrollView>

    </View>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },

  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },

  roleButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginHorizontal: 10,
  },

  roleSelected: {
    backgroundColor: '#007bff',
  },

  roleText: {
    color: '#000',
    fontWeight: '600',
  },

  button: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 12,
  },

});