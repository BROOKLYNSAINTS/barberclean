import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { loginWithEmail } from '@/services/restAuth';
import { getUserProfile } from '@/services/firebase';

import {
  registerForPushNotifications,
  saveNotificationToken
} from '@/services/notifications';

export default function LoginWithEmail() {

  const router = useRouter();
  const devBypass = false;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (devBypass) {
      router.replace('/(app)/(customer)/');
    }
  }, [devBypass]);

  if (devBypass) return null;

  const handleLogin = async () => {

    try {

      if (!email || !password) {
        setError('Please enter both email and password');
        return;
      }

      setLoading(true);
      setError('');

      const user = await loginWithEmail(email, password);

      const profile = await getUserProfile(user.uid);

      if (profile?.role === 'barber') {
        router.replace('/(app)/(barber)/dashboard');
      } else {
        router.replace('/(app)/(customer)');
      }

      const token = await registerForPushNotifications();

      if (token) {
        await saveNotificationToken(user.uid, token);
      }

    } catch (error) {

      console.log('Login error:', error);
      setError('Login failed. Please try again.');

    } finally {

      setLoading(false);

    }

  };

  return (

    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >

      <ScrollView contentContainerStyle={styles.container}>

        <Text style={styles.appTitle}>ScheduleSync</Text>

        <Text style={styles.appDescription}>
          ScheduleSync allows customers to book barber appointments,
          receive SMS reminders, and manage their bookings.
        </Text>

        <Text style={styles.title}>Login</Text>

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

          <View style={styles.passwordRow}>

            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />

            <TouchableOpacity
              onPress={() => setShowPassword(prev => !prev)}
              style={styles.eyeButton}
            >
              <Text style={styles.eyeText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>

          </View>

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

        {/* CUSTOMER REGISTRATION */}

        <View style={styles.footer}>

          <Text>Don't have an account? </Text>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.link}> Register</Text>
          </TouchableOpacity>

        </View>


      </ScrollView>

    </KeyboardAvoidingView>

  );

}

const styles = StyleSheet.create({

  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center'
  },

  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10
  },

  appDescription: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#555'
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },

  inputContainer: {
    marginBottom: 15
  },

  label: {
    marginBottom: 5,
    fontWeight: '500'
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },

  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },

  passwordInput: {
    flex: 1
  },

  eyeButton: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 6
  },

  eyeText: {
    color: '#2196F3',
    fontWeight: '500'
  },

  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 15
  },

  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20
  },

  link: {
    color: '#2196F3',
    fontWeight: 'bold'
  },

  barberBox: {
    marginTop: 35,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f3f3f3',
    alignItems: 'center'
  },

  barberTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5
  },

  barberText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 6
  },

  barberLink: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff'
  },

  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center'
  }

});
