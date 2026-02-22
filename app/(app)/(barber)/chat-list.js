// app/(app)/(barber)/chat-list.js

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '@/services/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';

async function getUserName(uid) {
  try {
    if (!uid) return 'Barber';
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return 'Barber';
    const data = snap.data() || {};
    return data.name || data.shopName || data.email || 'Barber';
  } catch {
    return 'Barber';
  }
}

export default function ChatListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setThreads([]);
        return;
      }

      const qRef = query(
        collection(db, 'chatThreads'),
        where('participants', 'array-contains', uid)
      );

      const snap = await getDocs(qRef);
      const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const enriched = await Promise.all(
        raw.map(async (t) => {
          const parts = Array.isArray(t.participants) ? t.participants : [];
          const otherId = parts.find((p) => p && p !== uid) || '';
          const otherName = await getUserName(otherId);

          return {
            ...t,
            otherId,
            otherName,
          };
        })
      );

      enriched.sort((a, b) => {
        const aS = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const bS = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return bS - aS;
      });

      setThreads(enriched);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={threads}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: 20,
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderColor: '#eee',
            }}
            onPress={() =>
              router.push({
                pathname: '/(app)/(barber)/chat',
                params: { threadId: item.id },
              })
            }
          >
            <Text style={{ fontSize: 18, fontWeight: '600' }}>
              {item.otherName || 'Barber'}
            </Text>
            <Text style={{ color: '#666', marginTop: 4 }}>
              {item.lastMessage || 'No messages yet'}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40 }}>
            No chats yet
          </Text>
        }
      />
    </SafeAreaView>
  );
}
