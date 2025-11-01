// app/(app)/(customer)/_layout.js
import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import theme from '@/styles/theme';

import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { app } from '../../../src/services/firebase';
import { useAuth } from '../../../src/contexts/AuthContext';

const db = getFirestore(app);

export default function CustomerTabLayout() {
  const { currentUser, loading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);


  useEffect(() => {
    if (!currentUser?.uid) return;

    // Get all notifications and filter on client side
    const q = query(
      collection(db, 'users', currentUser.uid, 'notifications')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filter for unread AND not cancelled notifications
      const activeUnreadNotifications = snapshot.docs.filter(doc => {
        const data = doc.data();
        const isUnread = data.read === false;
        const isNotCancelled = data.status !== 'cancelled';
        
        // Debug log each notification
        console.log('🔍 Notification debug:', {
          id: doc.id,
          title: data.title,
          read: data.read,
          status: data.status,
          isUnread,
          isNotCancelled,
          shouldCount: isUnread && isNotCancelled
        });
        
        return isUnread && isNotCancelled;
      });
      
      setUnreadCount(activeUnreadNotifications.length);
      console.log('📊 Notification badge count updated:', activeUnreadNotifications.length);
      console.log('📊 Active unread notifications:', activeUnreadNotifications.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        status: doc.data().status
      })));
    });

    return unsubscribe;
  }, [currentUser?.uid]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: theme.typography.fontSize.xsmall,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat-assistant"
        options={{
        title: 'AI Assistant',
        tabBarIcon: ({ color, size }) => (
      <Ionicons name="chatbubbles-outline" size={size}  color={color} />
    ),
  }}
/>
      <Tabs.Screen
        name="edit-profile"
        options={{
          title: 'Edit Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
            <Tabs.Screen
        name="notification"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />

      {/* Hidden screens */}
      <Tabs.Screen name="barber-selection" options={{ href: null }} />
      <Tabs.Screen name="barber-services" options={{ href: null }} />
      <Tabs.Screen name="appointment-booking" options={{ href: null }} />
      <Tabs.Screen name="appointment-confirmation" options={{ href: null }} />
      <Tabs.Screen name="appointment-details" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="hairstyle-recommendation" options={{ href: null }} />
      <Tabs.Screen name="ai-booking-assistant" options={{ href: null }} />
      <Tabs.Screen name="tip" options={{ href: null }} />
      <Tabs.Screen name="payment" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
    </Tabs>
  );
}
