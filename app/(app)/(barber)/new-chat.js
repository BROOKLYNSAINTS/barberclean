// app/(app)/(barber)/new-chat.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, getUserProfile, getBarbersByZipcode } from '@/services/firebase';
import { startOrGetChatThread } from '@/services/chatService';

export default function NewChatScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const me = auth.currentUser?.uid;
        if (!me) {
          router.replace('/(auth)/login');
          return;
        }

        const profile = await getUserProfile(me);
        const zip = String(profile?.zipcode || '').trim();
        if (!/^\d{5}$/.test(zip)) {
          Alert.alert('Profile Error', 'Zipcode missing on profile.');
          return;
        }

        const results = await getBarbersByZipcode(zip);
        const cleaned = (results || []).filter((b) => b?.id && b.id !== me);
        setBarbers(cleaned);
      } catch (e) {
        console.error('NewChat load error:', e);
        Alert.alert('Error', 'Failed to load barbers.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const startChat = async (barber) => {
    try {
      const me = auth.currentUser?.uid;
      const other = barber?.id;
      if (!me || !other) {
        Alert.alert('Chat Error', 'Missing user id.');
        return;
      }

      const threadId = await startOrGetChatThread(me, other);

      router.push({
        pathname: '/(app)/(barber)/chat',
        params: { threadId },
      });
    } catch (e) {
      console.error('NewChat start error:', e);
      Alert.alert('Error', e?.message ? String(e.message) : 'Failed to start chat.');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', margin: 20 }}>Start a new chat</Text>

      <FlatList
        data={barbers}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}
            onPress={() => startChat(item)}
          >
            <Text style={{ fontSize: 18 }}>{item.name || 'Barber'}</Text>
            <Text style={{ color: '#666', marginTop: 4 }}>{item.shopName || ''}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>No barbers found.</Text>}
      />
    </View>
  );
}
