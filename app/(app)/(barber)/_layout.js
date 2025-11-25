import React, { useEffect } from 'react';
import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import theme from "@/styles/theme"; // Adjusted path
import { Slot } from 'expo-router';
//import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
//export { BarberTabLayout as default } from '../../RootLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Text, StyleSheet, View, TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
});

export default function BarberTabLayout() {
  const router = useRouter();
  const { auth } = useAuth();

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
          name="bulletin"
          options={{
            title: "Bulletin",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="megaphone-outline" size={size} color={color} />
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
          name="chat-list"
          options={{
            title: "Chat List",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat-assistant"
          options={{
            title: "Chat Assistant",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sparkles-outline" size={size} color={color} />
            ),
          }}
        />
        {/* Hidden screens in this tab group, accessed via router.push */}
        <Tabs.Screen name="bulletin-post-details" options={{ href: null, title: 'Post Details' }} />
        <Tabs.Screen name="subscription" options={{ href: null, title: 'Subscription' }} />
        <Tabs.Screen name="chat" options={{ href: null, title: 'chat' }} />
        <Tabs.Screen name="view-barber-profile" options={{ href: null, title: 'view profile' }} />
        <Tabs.Screen name="subscription-payment" options={{ href: null, title: 'Payment' }} />
        <Tabs.Screen name="new-chat" options={{ href: null, title: 'new chat' }} />
      </Tabs>
  );
}

