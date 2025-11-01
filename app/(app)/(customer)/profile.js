import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
//import { getUserProfile, logoutUser, auth } from '@/services/firebase'; // Adjusted path
import { getUserProfile, logoutUser} from '@/services/firebase'; // Adjusted path

import { useRouter } from 'expo-router';

const ProfileScreen = () => {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfileData = async () => {
    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (user) {
        const userProfile = await getUserProfile(user.uid);
        if (userProfile) {
          setProfile(userProfile);
        } else {
          setError('Profile not found. Please complete your profile setup.');
          // Optionally, redirect to profile setup if profile is incomplete
           router.push('/(auth)/profile-setup'); 
        }
      } else {
        setError('User not authenticated.');
        router.replace('/(auth)/login'); // Redirect to login if no user
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Subscribe to auth state changes to refetch profile if user changes
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchProfileData();
      } else {
        setLoading(false);
        router.replace('/(auth)/login');
      }
    });
    return () => unsubscribe(); // Cleanup subscription
  }, [router]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.replace('/(auth)/login'); // Use replace to clear navigation stack
    } catch (err) {
      console.error('Logout error:', err);
      Alert.alert('Logout Failed', err.message || 'An error occurred during logout.');
      setError('Failed to logout');
    }
  };

  const handleEditProfile = () => {
    if (profile) {
      router.push({
        pathname: '/(app)/(customer)/edit-profile',
        params: { profile: JSON.stringify(profile) },
      });
    } else {
      Alert.alert('Error', 'Profile data is not available to edit.');
    }
  };
  
  const handleManageServices = () => {
    // This navigation is for barbers, ensure it points to the correct barber screen path
    router.push('/(app)/(barber)/manage-services');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error && !profile) { // Show error prominently if profile couldn't be loaded
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={fetchProfileData}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!profile) {
    // This case might be hit if fetchProfileData completes but profile is still null (e.g. not found)
    // It's somewhat redundant if error state above handles it, but good as a fallback.
    return (
      <View style={styles.centered}>
        <Text>No profile data found. You might need to complete your profile.</Text>
        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          {profile.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImagePlaceholderText}>
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{profile.name || 'N/A'}</Text>
        <Text style={styles.role}>{profile.role === 'barber' ? 'Barber' : 'Customer'}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{auth.currentUser?.email || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{profile.phone || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address:</Text>
          <Text style={styles.infoValue}>{profile.address || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Zipcode:</Text>
          <Text style={styles.infoValue}>{profile.zipcode || 'N/A'}</Text>
        </View>
      </View>

      {profile.role === 'barber' && profile.paymentInfo && (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Subscription Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={[
              styles.infoValue, 
              { color: profile.paymentInfo.subscriptionActive ? 'green' : 'red' }
            ]}>
              {profile.paymentInfo.subscriptionActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Since:</Text>
            <Text style={styles.infoValue}>
              {profile.paymentInfo.subscriptionDate 
                ? new Date(profile.paymentInfo.subscriptionDate).toLocaleDateString() 
                : 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Card:</Text>
            <Text style={styles.infoValue}>
              {profile.paymentInfo.cardNumber 
                ? `**** **** **** ${profile.paymentInfo.cardNumber.slice(-4)}` 
                : 'N/A'}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleEditProfile}>
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
        
        {profile.role === 'barber' && (
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleManageServices}
          >
            <Text style={styles.buttonText}>Manage Services</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorTextFooter}>{error}</Text>} 
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 10, // Added padding
  },
  profileImageContainer: {
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2, // Added border
    borderColor: '#2196F3', // Added border color
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  profileImagePlaceholderText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  role: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  infoSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#444',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center', // Align items vertically
  },
  infoLabel: {
    fontWeight: '500',
    width: 100,
    color: '#555',
  },
  infoValue: {
    flex: 1,
    color: '#333',
    fontSize: 15,
  },
  buttonContainer: {
    marginTop: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 14, // Increased padding
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12, // Increased margin
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  logoutButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16,
  },
  errorTextFooter: {
    color: 'red',
    marginTop: 15,
    textAlign: 'center',
    fontSize: 14,
  }
});

export default ProfileScreen;
