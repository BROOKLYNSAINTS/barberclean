// app/(app)/(customer)/_layout.js

import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import theme from '@/styles/theme';

import { getFirestore, collection, query, onSnapshot } from 'firebase/firestore';
import { app } from '../../../src/services/firebase';
import { useAuth } from '../../../src/contexts/AuthContext';

const db = getFirestore(app);

export default function CustomerTabLayout() {

  const { currentUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, 'users', currentUser.uid, 'notifications')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {

      const activeUnreadNotifications = snapshot.docs.filter(doc => {
        const data = doc.data();
        const isUnread = data.read === false;
        const isNotCancelled = data.status !== 'cancelled';
        return isUnread && isNotCancelled;
      });

      setUnreadCount(activeUnreadNotifications.length);

    });

    return unsubscribe;

  }, [currentUser?.uid]);

  return (

    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,

        // FIX FOR IPAD REVIEW ISSUE
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          height: 70,
          paddingBottom: 10,
          paddingTop: 6,
        },

        tabBarItemStyle: {
          paddingVertical: 6,
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
        name="faq"
        options={{
          title: 'FAQ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="help-circle-outline" size={size} color={color} />
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

      {/* Hidden screens */}

      <Tabs.Screen name="barber-selection" options={{ href: null }} />
      <Tabs.Screen name="barber-services" options={{ href: null }} />
      <Tabs.Screen name="appointment-booking" options={{ href: null }} />
      <Tabs.Screen name="appointment-confirmation" options={{ href: null }} />
      <Tabs.Screen name="appointment-details" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="hairstyle-recommendation" options={{ href: null }} />
      <Tabs.Screen name="ai-booking-assistant" options={{ href: null }} />
      <Tabs.Screen name="payment" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="notification" options={{ href: null }} />
      <Tabs.Screen name="chat-assistant" options={{ href: null }} />
      <Tabs.Screen name="tip" options={{ href: null }} />
      <Tabs.Screen name="review" options={{ href: null }} />
      <Tabs.Screen name="cancel-appointment" options={{ href: null }} />

    </Tabs>

  );
}