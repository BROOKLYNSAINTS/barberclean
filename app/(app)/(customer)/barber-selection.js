import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getBarbersByZipcode } from '@/services/firebase';

export default function SelectBarberScreen() {
  const router = useRouter();
  const { zipcode } = useLocalSearchParams();

  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (zipcode) {
      fetchBarbers(zipcode);
    }
  }, [zipcode]);

  const fetchBarbers = async (zip) => {
    try {
      setLoading(true);
      const results = await getBarbersByZipcode(zip);

      // ✅ sanitize + guarantee stable IDs
      const cleaned = (results || [])
        .filter((b) => b && b.id)
        .map((b) => ({
          ...b,
          id: String(b.id), // force string
          name: b.name || 'Barber',
          rating: Number.isFinite(Number(b.rating)) ? Number(b.rating) : 0,
          image: typeof b.image === 'string' && b.image.length > 0 ? b.image : null,
        }));

      setBarbers(cleaned);
    } catch (err) {
      console.error('Failed to load barbers:', err);
      setError('Could not load barbers');
    } finally {
      setLoading(false);
    }
  };

  const handleBarberSelect = useCallback(
    (barber) => {
      if (!barber?.id) return;

      router.push({
        pathname: '/(app)/(customer)/barber-services',
        params: { barber: JSON.stringify(barber) },
      });
    },
    [router]
  );

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => handleBarberSelect(item)}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <Text style={styles.placeholderText}>
              {item.name?.charAt(0)?.toUpperCase() || 'B'}
            </Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.rating}>⭐ {item.rating}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>Loading barbers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a Barber</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={barbers}
        keyExtractor={(item) => item.id}   // ✅ NEVER index
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40 }}>
            No barbers found in this area
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  placeholderAvatar: {
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  info: {
    marginLeft: 15,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  rating: {
    marginTop: 4,
    color: '#555',
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
});
