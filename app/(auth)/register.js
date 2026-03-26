import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { registerUser, createUserProfile } from '@/services/firebase';
import { useRouter } from 'expo-router';

const RegisterScreen = () => {

  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {

    try {

      if (!email || !password || !confirmPassword) {
        setError('Please fill in all fields');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      setLoading(true);
      setError('');

      const userCredential = await registerUser(email.trim(), password);

      const userId =
        userCredential?.user?.uid || userCredential?.uid;

      if (!userId) {
        throw new Error(
          'Registration succeeded but no user ID was returned.'
        );
      }

      await createUserProfile(userId, {
        email: email.trim(),
        role: 'customer',
        userType: 'customer',
        createdAt: new Date().toISOString(),
      });

      router.push({
        pathname: '/profile-setup',
        params: { userId, email: email.trim() },
      });

    } catch (error) {

      console.log('Registration error:', error);
      setError(error?.message || 'Unable to create account right now.');

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

      <Text style={styles.title}>Create Your Account</Text>

      <Text style={styles.description}>
      Create an account to book barber appointments or manage your barber business with ScheduleSync.
      </Text>
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

        <View style={styles.inputContainer}>

          <Text style={styles.label}>Confirm Password</Text>

          <View style={styles.passwordRow}>

            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />

            <TouchableOpacity
              onPress={() => setShowConfirmPassword(prev => !prev)}
              style={styles.eyeButton}
            >
              <Text style={styles.eyeText}>
                {showConfirmPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>

          </View>

        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >

          <Text style={styles.buttonText}>
            {loading ? 'Creating Account...' : 'Register'}
          </Text>

        </TouchableOpacity>

        <View style={styles.footer}>

          <Text>Already have an account? </Text>

          <TouchableOpacity
            onPress={() => router.push('/login')}
          >
            <Text style={styles.link}>Login</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>

    </KeyboardAvoidingView>

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
    marginBottom: 10,
    textAlign: 'center',
  },

  description: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#555'
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

  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  passwordInput: {
    flex: 1,
  },

  eyeButton: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  eyeText: {
    color: '#2196F3',
    fontWeight: '500',
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

export default RegisterScreen;
