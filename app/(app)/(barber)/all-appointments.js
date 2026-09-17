import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { auth, getBarberAppointments } from '@/services/firebase';

// DATE PARSER
function parseAppointmentDate(appt) {
  if (!appt?.date || !appt?.time) return null;

  try {
    const cleanTime = String(appt.time).replace(/\s+/g, ' ').trim();
    const [time, modifier] = cleanTime.split(' ');
    if (!time || !modifier) return null;

    let [hours, minutes] = time.split(':').map(Number);

    const mod = modifier.toUpperCase();
    if (mod === 'PM' && hours !== 12) hours += 12;
    if (mod === 'AM' && hours === 12) hours = 0;

    const [year, month, day] = appt.date.split('-').map(Number);

    return new Date(year, month - 1, day, hours, minutes);
  } catch {
    return null;
  }
}

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

        data.sort((a, b) => {
          const d1 = parseAppointmentDate(a);
          const d2 = parseAppointmentDate(b);
          return (d1?.getTime() || 0) - (d2?.getTime() || 0);
        });

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

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (f === 'today') {
      return appts.filter(a => a.date === todayStr);
    }

    if (f === 'upcoming') {
      return appts.filter(a => {
        const dt = parseAppointmentDate(a);
        if (!dt) return false;

        return dt > startOfToday && a.date !== todayStr;
      });
    }

    return appts;
  }, [appts, filter]);

  const title = String(filter || 'all').toUpperCase();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading appointments…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f2f5' }}>

      {/* 🔥 HEADER BOX (MATCHES DASHBOARD STYLE) */}
      <View
        style={{
          backgroundColor: '#fff',
          padding: 16,
          borderBottomWidth: 1,
          borderColor: '#eee',
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700' }}>
          {title} Appointments
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, idx) => String(item.id ?? idx)}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 14,
              backgroundColor: '#fff',
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
            <Text style={{ fontSize: 16, fontWeight: '700' }}>
              {item.customerName || 'N/A'}
            </Text>
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
