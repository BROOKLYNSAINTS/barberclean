import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { loginWithEmail } from '@/services/restAuth';
import { getUserProfile } from '@/services/firebase'; // Add this at the top

import { registerForPushNotifications, saveNotificationToken } from '@/services/notifications';


export default function LoginWithEmail () {  
  
  
  
  const router = useRouter();
  const devBypass = false; // ✅ Set to false when ready to test login normally

  useEffect(() => {
    if (devBypass) {
      console.log('🛠 Dev bypass active. Redirecting to /customer...');
      router.replace('/(app)/(customer)/');
    }
  }, []);

  // Skip rendering form if bypassing
  if (devBypass) return null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

const handleLogin = async () => {
  console.log('🔄 Login button pressed');
  try {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    setLoading(true);
    setError('');
    console.log('📤 Sending credentials to Firebase...');
    const user = await loginWithEmail(email, password);
    console.log('✅ Firebase login response:', user);

    // 👇 Fetch Firestore profile
    const profile = await getUserProfile(user.uid);
    console.log('🎭 User role from Firestore:', profile?.role);


    // 👇 Role-based redirect
    if (profile?.role === 'barber') {
      router.replace('/(app)/(barber)/dashboard');
    } else {
      router.replace('/(app)/(customer)');
    }

    // ✅ Notification setup
    const token = await registerForPushNotifications();
    console.log('🔔 Notification token:', token);
    if (token) {
      await saveNotificationToken(user.uid, token);
    }
  } catch (error) {
    console.log('🚫 Login error:', error);
    setError('Login failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity 
        onPress={() => router.push('/(auth)/forgot-password')}
        style={styles.forgotPassword}
      >
        <Text style={styles.link}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.link}>Register</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  link: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
});

