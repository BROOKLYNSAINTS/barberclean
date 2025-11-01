// src/components/DebugUser.js
import React from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function DebugUser({ screenName }) {
  const { currentUser, loading } = useAuth();

  return (
    <View style={{ padding: 10 }}>
      <Text>🔍 Debug Info - {screenName}</Text>
      <Text>👤 currentUser: {currentUser ? currentUser.email : 'null'}</Text>
      <Text>⏳ loading: {loading ? 'true' : 'false'}</Text>
    </View>
  );
}
