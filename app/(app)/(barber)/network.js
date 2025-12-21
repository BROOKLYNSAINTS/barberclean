import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, getUserProfile, getBarbersByZipcode } from '@/services/firebase';
import { startOrGetChatThread } from '@/services/chatService';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card } from '@/components/UIComponents';

export default function BarberNetworkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const startingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState([]);
  const [zipcode, setZipcode] = useState('');
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = auth.currentUser?.uid;
      if (!me) {
        Alert.alert('Auth Error', 'Not logged in');
        return;
      }

      const profile = await getUserProfile(me);
      if (!profile?.zipcode) {
        Alert.alert('Profile Error', 'Zipcode missing');
        return;
      }

      const zip = String(profile.zipcode);
      setZipcode(zip);

      const results = await getBarbersByZipcode(zip);
      setBarbers(results.filter(b => b.id !== me));
    } catch (e) {
      Alert.alert('Error', 'Failed to load network');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleMessage = async (barber) => {
    if (startingRef.current) return;
    startingRef.current = true;

    try {
      const me = auth.currentUser?.uid;
      const other = barber?.id;

      if (!me || !other) {
        Alert.alert('Chat Error', 'Missing user id');
        return;
      }

      const threadId = await startOrGetChatThread(me, other);

      router.push({
        pathname: '/(app)/(barber)/chat',
        params: { threadId },
      });
    } catch (e) {
      Alert.alert('Chat Error', String(e));
    } finally {
      startingRef.current = false;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={barbers}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.name}>{item.name || 'Barber'}</Text>
            <TouchableOpacity style={styles.btn} onPress={() => handleMessage(item)}>
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Message</Text>
            </TouchableOpacity>
          </Card>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center' }}>No barbers found</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 16, marginBottom: 12 },
  name: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  btn: {
    flexDirection: 'row',
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnText: { color: '#fff', fontWeight: 'bold' },
});
