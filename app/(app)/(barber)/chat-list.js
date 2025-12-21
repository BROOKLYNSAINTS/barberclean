import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { auth, db } from '@/services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function ChatListScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const q = query(
        collection(db, 'chatThreads'),
        where('participants', 'array-contains', uid)
      );

      const snap = await getDocs(q);
      setThreads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={threads}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}
            onPress={() =>
              router.push({
                pathname: '/(app)/(barber)/chat',
                params: { threadId: item.id },
              })
            }
          >
            <Text style={{ fontSize: 18 }}>Chat</Text>
            <Text style={{ color: '#666' }}>{item.lastMessage || 'No messages yet'}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>No chats yet</Text>}
      />
    </View>
  );
}
