import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '@/services/firebase';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '@/services/firebase';

const db = getFirestore(app);

export default function ChatListScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const currentBarberId = auth.currentUser?.uid;
        const q = query(
          collection(db, 'chatThreads'),
          where('participants', 'array-contains', currentBarberId)
        );
        const snapshot = await getDocs(q);
        const threadsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setThreads(threadsData);
      } catch (error) {
        console.error('Error fetching chat threads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', margin: 20 }}>Chats</Text>
      <Button
        title="New Chat"
        onPress={() => router.push('/(app)/(barber)/new-chat')}
      />
      <FlatList
        data={threads}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          // Find the other barber's info (not the current user)
          const otherBarber = item.participantsInfo?.find(
            b => b.id !== auth.currentUser?.uid
          );
          return (
            <TouchableOpacity
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#eee',
              }}
              onPress={() =>
                router.push({
                  pathname: '/(app)/(barber)/chat',
                  params: { threadId: item.id },
                })
              }
            >
              <Text style={{ fontSize: 18 }}>
                {otherBarber?.name || otherBarber?.id || 'Barber'}
              </Text>
              <Text style={{ color: '#666', marginTop: 4 }}>
                Last message: {item.lastMessage || 'No messages yet'}
              </Text>
              <Text style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>
                {item.timestamp
                  ? new Date(item.timestamp.seconds * 1000).toLocaleString()
                  : ''}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40 }}>
            No chats yet.
          </Text>
        }
      />
    </View>
  );
}

