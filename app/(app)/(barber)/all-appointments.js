import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { auth, getBarberAppointments } from '@/services/firebase';

export default function AllAppointmentsScreen() {
  const router = useRouter();
  const { filter } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [appts, setAppts] = useState([]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const uid = auth.currentUser?.uid;
        if (!uid) {
          setAppts([]);
          return;
        }
        const data = (await getBarberAppointments(uid)) || [];
        // sort ascending
        data.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
        setAppts(data);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const f = String(filter || '').toLowerCase();
    if (!f) return appts;

    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (f === 'today') return appts.filter(a => a.date === today);

    if (f === 'upcoming') {
      return appts.filter(a => {
        const dt = new Date(`${a.date}T${a.time}`);
        return dt >= todayStart && a.date !== today;
      });
    }

    return appts;
  }, [appts, filter]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading appointments…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', padding: 16 }}>
        {String(filter || 'all').toUpperCase()} Appointments
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item, idx) => String(item.id ?? idx)}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 14,
              borderWidth: 1,
              borderColor: '#eee',
              borderRadius: 10,
              marginBottom: 12,
            }}
            onPress={() =>
              router.push({
                pathname: '/(app)/(barber)/appointment-details',
                params: { appointment: JSON.stringify(item) },
              })
            }
          >
            <Text style={{ fontSize: 16, fontWeight: '700' }}>{item.customerName || 'N/A'}</Text>
            <Text style={{ color: '#666', marginTop: 4 }}>
              {item.date} @ {item.time} • {item.serviceName || 'N/A'}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#666' }}>
            No appointments.
          </Text>
        }
      />
    </View>
  );
}
