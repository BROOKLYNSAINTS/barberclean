// app/(app)/(barber)/network.js
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
  const [searchZipcode, setSearchZipcode] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const fetchBarbers = useCallback(async (zip) => {
    try {
      setError('');
      const me = auth.currentUser?.uid;
      if (!me) {
        Alert.alert('Auth Error', 'Not logged in');
        return;
      }

      const results = await getBarbersByZipcode(zip);

      const cleaned = (results || []).filter((b) => b?.id && b.id !== me);
      setBarbers(cleaned);
    } catch (e) {
      console.error('Network fetch error:', e);
      setError('Failed to load network.');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const me = auth.currentUser?.uid;
      if (!me) {
        router.replace('/(auth)/login');
        return;
      }

      const profile = await getUserProfile(me);
      const zip = String(profile?.zipcode || '').trim();

      if (!/^\d{5}$/.test(zip)) {
        setZipcode('');
        setSearchZipcode('');
        setLoading(false);
        setError('Zipcode missing on profile.');
        return;
      }

      setZipcode(zip);
      setSearchZipcode(zip);
      await fetchBarbers(zip);
    } catch (e) {
      console.error('Load error:', e);
      setError('Failed to load network.');
      setLoading(false);
    }
  }, [fetchBarbers, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSearch = () => {
    const zip = String(zipcode || '').trim();
    if (!/^\d{5}$/.test(zip)) {
      Alert.alert('Invalid Zipcode', 'Enter a valid 5-digit zipcode.');
      return;
    }
    setSearching(true);
    setSearchZipcode(zip);
    fetchBarbers(zip);
  };

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
      console.error('Start chat error:', e);
      Alert.alert('Chat Error', e?.message ? String(e.message) : String(e));
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 10}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <Text style={styles.title}>Barber Network</Text>
              <Text style={styles.subtitle}>Find barbers near you</Text>
            </View>

            <View style={styles.searchRow}>
              <TextInput
                value={zipcode}
                onChangeText={setZipcode}
                placeholder="Zipcode"
                keyboardType="numeric"
                maxLength={5}
                style={styles.input}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              <Button title={searching ? '...' : 'Search'} onPress={handleSearch} disabled={searching} />
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <FlatList
              data={barbers}
              keyExtractor={(i) => String(i.id)}
              contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
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
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { padding: 20, backgroundColor: '#fff', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#666' },

  searchRow: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', gap: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, backgroundColor: '#fff' },

  errorBox: { marginHorizontal: 16, marginTop: 10, padding: 12, backgroundColor: '#ffe5e5', borderRadius: 10 },
  errorText: { color: '#b00020', fontWeight: '600', textAlign: 'center' },

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
