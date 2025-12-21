import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { app, auth } from '@/services/firebase';

const db = getFirestore(app);

export default function NewChatScreen() {
  const router = useRouter();
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'barber')
        );
        const snapshot = await getDocs(q);
        const barberList = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(barber => barber.id !== auth.currentUser?.uid); // Exclude self
        setBarbers(barberList);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch barbers.');
      } finally {
        setLoading(false);
      }
    };
    fetchBarbers();
  }, []);

  const handleCreateChat = async (recipientId) => {
    setLoading(true);
    try {
      const currentBarberId = auth.currentUser?.uid;
      if (!currentBarberId) {
        console.warn('handleCreateChat: no authenticated user');
        Alert.alert('Authentication Error', 'You must be signed in to start a chat.');
        return;
      }
      if (!recipientId) {
        console.warn('handleCreateChat: missing recipientId');
        Alert.alert('Error', 'Invalid recipient.');
        return;
      }
      const currentBarber = barbers.find(b => b.id === currentBarberId);
      const recipientBarber = barbers.find(b => b.id === recipientId);

      const pairKey = [currentBarberId, recipientId].sort().join('-');
      const threadsQuery = query(
        collection(db, 'chatThreads'),
        where('pairKey', '==', pairKey)
      );
      const threadsSnapshot = await getDocs(threadsQuery);

      const existingThread = threadsSnapshot.docs.find(doc => {
        const participants = doc.data().participants;
        return (
          Array.isArray(participants) &&
          participants.length === 2 &&
          participants.includes(currentBarberId) &&
          participants.includes(recipientId)
        );
      });

      if (existingThread) {
        router.replace({
          pathname: '/(app)/(barber)/chat',
          params: { threadId: existingThread.id }
        });
      } else {
        const docRef = await addDoc(collection(db, 'chatThreads'), {
          participants: [currentBarberId, recipientId],
          pairKey,
          createdAt: serverTimestamp(),
          lastMessage: '',
          participantsInfo: [
            { id: currentBarberId, role: 'barber', name: currentBarber?.name || 'Barber' },
            { id: recipientId, role: 'barber', name: recipientBarber?.name || 'Barber' }
          ]
        });
        router.replace({
          pathname: '/(app)/(barber)/chat',
          params: { threadId: docRef.id }
        });
      }
    } catch (error) {
      console.error('Failed to create or find chat thread:', error);
      Alert.alert('Error', error?.message || 'Failed to create or find chat thread.');
    } finally {
      setLoading(false);
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
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginTop: 8, marginBottom: 16 }}>
        Select a Barber to Chat
      </Text>
      <FlatList
        data={barbers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#eee',
              backgroundColor: '#fff',
              marginBottom: 8,
              borderRadius: 8,
            }}
            onPress={() => handleCreateChat(item.id)}
          >
            <Text style={{ fontSize: 18 }}>{item.name || 'Barber'}</Text>
            <Text style={{ color: '#666', marginTop: 4 }}>{item.email}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40 }}>
            No other barbers found.
          </Text>
        }
      />
    </View>
  );
}

