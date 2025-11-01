import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../../../src/contexts/AuthContext';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { app } from '../../../src/services/firebase';
import { updatePassword } from 'firebase/auth';

const db = getFirestore(app);

export default function EditProfileScreen() {
  const { currentUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.uid) return;

      try {
        const ref = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || '');
          setPhone(data.phone || '');
          setAddress(data.address || '');
          setZipcode(data.zipcode || '');
          setEmail(currentUser.email || '');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        Alert.alert('Error', 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const ref = doc(db, 'users', currentUser.uid);
      await updateDoc(ref, { name, phone, address, zipcode });

      if (newPassword) {
        await updatePassword(currentUser, newPassword);
        Alert.alert('Success', 'Profile and password updated!');
      } else {
        Alert.alert('Success', 'Profile updated!');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', 'Could not save profile.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />

      <Text style={styles.label}>Address</Text>
      <TextInput value={address} onChangeText={setAddress} style={styles.input} />

      <Text style={styles.label}>Zip Code</Text>
      <TextInput value={zipcode} onChangeText={setZipcode} style={styles.input} keyboardType="number-pad" />

      <Text style={styles.label}>Phone</Text>
      <TextInput value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />

      <Text style={styles.label}>Username (Email)</Text>
      <TextInput value={email} editable={false} style={[styles.input, styles.disabled]} />

      <Text style={styles.label}>New Password</Text>
      <TextInput value={newPassword} onChangeText={setNewPassword} style={styles.input} secureTextEntry />

      <Button title="Save Changes" onPress={handleSave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 48, // Adjust as needed for spacing
    paddingBottom: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    marginTop: 16,
    fontWeight: 'bold',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  disabled: {
    backgroundColor: '#f0f0f0',
  },
});
