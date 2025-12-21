// app/(app)/(barber)/network.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, getUserProfile, getBarbersByZipcode } from '@/services/firebase';
import { startOrGetChatThread } from '@/services/chatService';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/UIComponents';

function resolveBarberUid(barber) {
  // support any shape you might be returning from Firestore
  return (
    barber?.authUid ||
    barber?.uid ||
    barber?.userId ||
    barber?.id || // keep last
    ''
  );
}

export default function BarberNetworkScreen() {
  const router = useRouter();
  const startingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);

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
      const results = await getBarbersByZipcode(zip);

      // Filter out me using resolved uid (NOT assuming "id" is auth uid)
      const cleaned = (results || []).filter((b) => {
        const other = resolveBarberUid(b);
        return !!other && other !== me;
      });

      setBarbers(cleaned);

      // DEBUG: show what the first barber object looks like
      if (cleaned?.length) {
        const sample = cleaned[0];
        const sampleUid = resolveBarberUid(sample);
        Alert.alert(
          'DEBUG (Network loaded)',
          `me=${me}\nzip=${zip}\nfirst barber uid=${sampleUid}\nfields: ${Object.keys(sample).join(', ')}`
        );
      } else {
        Alert.alert('DEBUG (Network loaded)', `me=${me}\nzip=${zip}\n0 barbers after filtering`);
      }
    } catch (e) {
      Alert.alert('Error', `Failed to load network: ${String(e)}`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleMessage = async (barber) => {
    if (startingRef.current) return;
    startingRef.current = true;

    try {
      const me = auth.currentUser?.uid;
      const other = resolveBarberUid(barber);

      // DEBUG: show exactly what we're about to use
      Alert.alert('DEBUG (Start chat)', `me=${me}\nother=${other}`);

      if (!me || !other) {
        Alert.alert(
          'Chat Error',
          `Missing user id\nme=${String(me)}\nother=${String(other)}`
        );
        return;
      }

      const threadId = await startOrGetChatThread(me, other);

      Alert.alert('DEBUG (Thread created/found)', `threadId=${threadId}`);

      router.push({
        pathname: '/(app)/(barber)/chat',
        params: { threadId },
      });
    } catch (e) {
      Alert.alert('Chat Error', `Could not start chat:\n${String(e)}`);
      console.error(e);
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
        keyExtractor={(i, idx) => resolveBarberUid(i) || String(idx)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.name}>{item?.name || 'Barber'}</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                uid: {resolveBarberUid(item) || 'MISSING'}
              </Text>
            </View>

            <TouchableOpacity style={styles.btn} onPress={() => handleMessage(item)}>
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Message</Text>
            </TouchableOpacity>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center' }}>No barbers found</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 16, marginBottom: 12 },
  name: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  metaRow: { marginBottom: 10 },
  metaText: { fontSize: 12, color: '#666' },
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
