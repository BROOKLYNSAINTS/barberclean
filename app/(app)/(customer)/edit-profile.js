import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/contexts/AuthContext';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { deleteUser, updatePassword } from 'firebase/auth';
import { app } from '../../../src/services/firebase';

const db = getFirestore(app);

export default function EditProfileScreen() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const addressRef = useRef(null);
  const zipcodeRef = useRef(null);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);

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

  // 🔥 DELETE ACCOUNT FUNCTION (Customer)
  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              const userId = currentUser.uid;

              // 1️⃣ Delete Firestore user document
              await deleteDoc(doc(db, 'users', userId));

              // 2️⃣ Delete Firebase Auth user
              await deleteUser(currentUser);

              Alert.alert('Account Deleted', 'Your account has been permanently deleted.');

              router.replace('/(auth)/login');
            } catch (err) {
              console.error('Delete account error:', err);
              Alert.alert(
                'Error',
                'Unable to delete account. You may need to log in again.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Profile</Text>
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => addressRef.current?.focus()}
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            ref={addressRef}
            value={address}
            onChangeText={setAddress}
            style={styles.input}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => zipcodeRef.current?.focus()}
          />

          <Text style={styles.label}>Zip Code</Text>
          <TextInput
            ref={zipcodeRef}
            value={zipcode}
            onChangeText={setZipcode}
            style={styles.input}
            keyboardType="number-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => phoneRef.current?.focus()}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            ref={phoneRef}
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            keyboardType="phone-pad"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <Text style={styles.label}>Username (Email)</Text>
          <TextInput value={email} editable={false} style={[styles.input, styles.disabled]} />

          <Text style={styles.label}>New Password</Text>
          <TextInput
            ref={passwordRef}
            value={newPassword}
            onChangeText={setNewPassword}
            style={styles.input}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          <Button title="Save Changes" onPress={handleSave} />

          {/* 🔥 DELETE SECTION */}
          <View style={styles.deleteSection}>
            <Text style={styles.deleteTitle}>Danger Zone</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 48,
    paddingBottom: 12,
    alignItems: 'center',
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
  deleteSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'red',
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
