// app/(app)/(barber)/_layout.js

import React from 'react';
import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import theme from "@/styles/theme";
import { useAuth } from '@/contexts/AuthContext';

export default function BarberTabLayout() {

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          height: 70,
          paddingBottom: 10,
        },
      }}
    >

      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="availability"
        options={{
          title: "Availability",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-number-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="manage-services"
        options={{
          title: "Services",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cut-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="network"
        options={{
          title: "Network",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="edit-profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
        <Tabs.Screen
        name="chat-assistant"
        options={{
          title: "Assistant",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden screens */}

      <Tabs.Screen name="bulletin" options={{ href: null }} />
      <Tabs.Screen name="faq" options={{ href: null }} />
      <Tabs.Screen name="chat-list" options={{ href: null }} />

      <Tabs.Screen name="bulletin-post-details" options={{ href: null }} />
      <Tabs.Screen name="subscription" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="view-barber-profile" options={{ href: null }} />
      <Tabs.Screen name="subscription-payment" options={{ href: null }} />
      <Tabs.Screen name="new-chat" options={{ href: null }} />
      <Tabs.Screen name="all-appointments" options={{ href: null }} />
      <Tabs.Screen name="appointment-details" options={{ href: null }} />
      <Tabs.Screen name="barber-subscription" options={{ href: null }} />
      <Tabs.Screen name="stripe-onboarding" options={{ href: null }} />
    </Tabs>
  );
}