import { Stack } from "expo-router";
//import { Slot, SplashScreen } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
// 
//export default function authLayout() {
//  useEffect(() => {
//    SplashScreen.hideAsync();
//  }, []);

//  return (
//    <SafeAreaProvider>
//      <Slot />
//    </SafeAreaProvider>
//  );
//}
export default function authLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="profile-setup" />
      {/* Any other auth-flow screens would be listed here */}
    </Stack>
  );
}

