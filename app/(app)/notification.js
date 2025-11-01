import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registerForPushNotificationsAsync, getCalendarPermissions } from '@/services/notifications';
import { getUserProfile, updateUserProfile, auth } from '@/services/firebase';








const NotificationSettingsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Notification settings
  const [pushEnabled, setPushEnabled] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [calendarEnabled, setCalendarEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  
  // Permission states
  const [pushPermission, setPushPermission] = useState(false);
  const [calendarPermission, setCalendarPermission] = useState(false);

  useEffect(() => {
    fetchSettings();
    checkPermissions();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      
      const user = auth.currentUser;
      const userProfile = await getUserProfile(user.uid);
      
      // Set notification settings from profile if available
      if (userProfile.notificationSettings) {
        setPushEnabled(userProfile.notificationSettings.pushEnabled ?? true);
        setReminderEnabled(userProfile.notificationSettings.reminderEnabled ?? true);
        setCalendarEnabled(userProfile.notificationSettings.calendarEnabled ?? true);
        setSmsEnabled(userProfile.notificationSettings.smsEnabled ?? true);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      setError('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const checkPermissions = async () => {
    try {
      // Check push notification permission
      const pushToken = await registerForPushNotificationsAsync();
      setPushPermission(!!pushToken);
      
      // Check calendar permission
      const hasCalendarPermission = await getCalendarPermissions();
      setCalendarPermission(hasCalendarPermission);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      
      const user = auth.currentUser;
      
      // Update profile with notification settings
      await updateUserProfile(user, {
        notificationSettings: {
          pushEnabled,
          reminderEnabled,
          calendarEnabled,
          smsEnabled,
        }
      });
      
      Alert.alert('Success', 'Notification settings saved successfully');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setError('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const requestPushPermission = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      setPushPermission(!!token);
      
      if (token) {
        setPushEnabled(true);
        Alert.alert('Success', 'Push notification permission granted');
      } else {
        Alert.alert(
          'Permission Required',
          'Push notifications require permission. Please enable notifications for this app in your device settings.'
        );
      }
    } catch (error) {
      console.error('Error requesting push permission:', error);
      Alert.alert('Error', 'Failed to request push notification permission');
    }
  };

  const requestCalendarPermission = async () => {
    try {
      const granted = await getCalendarPermissions();
      setCalendarPermission(granted);
      
      if (granted) {
        setCalendarEnabled(true);
        Alert.alert('Success', 'Calendar permission granted');
      } else {
        Alert.alert(
          'Permission Required',
          'Calendar integration requires permission. Please enable calendar access for this app in your device settings.'
        );
      }
    } catch (error) {
      console.error('Error requesting calendar permission:', error);
      Alert.alert('Error', 'Failed to request calendar permission');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading notification settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Settings</Text>
        <Text style={styles.subtitle}>
          Manage how you receive appointment notifications and reminders
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive notifications directly on your device
            </Text>
          </View>
          
          <Switch
            value={pushEnabled}
            onValueChange={(value) => {
              if (value && !pushPermission) {
                requestPushPermission();
              } else {
                setPushEnabled(value);
              }
            }}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={pushEnabled ? '#2196F3' : '#f4f3f4'}
          />
        </View>
        
        {!pushPermission && (
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestPushPermission}
          >
            <Ionicons name="notifications" size={16} color="#2196F3" />
            <Text style={styles.permissionButtonText}>
              Grant Push Notification Permission
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Appointment Reminders</Text>
            <Text style={styles.settingDescription}>
              Receive reminders one day before your appointment
            </Text>
          </View>
          
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={reminderEnabled ? '#2196F3' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Calendar Integration</Text>
            <Text style={styles.settingDescription}>
              Add appointments to your device calendar
            </Text>
          </View>
          
          <Switch
            value={calendarEnabled}
            onValueChange={(value) => {
              if (value && !calendarPermission) {
                requestCalendarPermission();
              } else {
                setCalendarEnabled(value);
              }
            }}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={calendarEnabled ? '#2196F3' : '#f4f3f4'}
          />
        </View>
        
        {!calendarPermission && (
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestCalendarPermission}
          >
            <Ionicons name="calendar" size={16} color="#2196F3" />
            <Text style={styles.permissionButtonText}>
              Grant Calendar Permission
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>SMS Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive text messages for appointment confirmations and reminders
            </Text>
          </View>
          
          <Switch
            value={smsEnabled}
            onValueChange={setSmsEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={smsEnabled ? '#2196F3' : '#f4f3f4'}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.disabledButton]}
        onPress={handleSaveSettings}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Settings</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    color: '#f44336',
    padding: 16,
    textAlign: 'center',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 4,
    marginTop: 12,
  },
  permissionButtonText: {
    color: '#2196F3',
    marginLeft: 8,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
});

export default NotificationSettingsScreen;
