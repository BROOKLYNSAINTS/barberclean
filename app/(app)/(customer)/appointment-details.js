import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function AppointmentDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  let appointment = null;
  try {
    appointment = params.appointment
      ? JSON.parse(params.appointment)
      : null;
  } catch (_err) {
    console.log('Failed to parse appointment');
  }

  if (!appointment) return null;

  const handleCancel = () => {
    router.push({
      pathname: '/(app)/(customer)/cancel-appointment',
      params: { appointmentId: appointment.id },
    });
  };

  const handleTip = () => {
    router.push({
      pathname: '/(app)/(customer)/tip',
      params: { appointmentId: appointment.id },
    });
  };

  const handlePay = () => {
    const rawAmount = Number(appointment.servicePrice ?? 0);
    const amount = Number.isFinite(rawAmount) ? rawAmount : 0;

    router.push({
      pathname: '/(app)/(customer)/payment',
      params: {
        appointmentId: appointment.id,
        barberId: appointment.barberId,
        amount: String(amount),
        serviceName: appointment.serviceName || 'Barber Service',
        barberName: appointment.barberName || 'Barber',
      },
    });
  };

  const handleReview = () => {
    router.push({
      pathname: '/(app)/(customer)/review',
      params: { appointment: JSON.stringify(appointment) },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <Text style={styles.header}>Appointment Details</Text>

        <View style={styles.row}>
          <Ionicons name="person-outline" size={20} />
          <Text style={styles.label}>Barber:</Text>
          <Text style={styles.value}>{appointment.barberName}</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="cut-outline" size={20} />
          <Text style={styles.label}>Service:</Text>
          <Text style={styles.value}>{appointment.serviceName}</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={20} />
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{formatDate(appointment.date)}</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="time-outline" size={20} />
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>{appointment.time}</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="pricetag-outline" size={20} />
          <Text style={styles.label}>Price:</Text>
          <Text style={styles.value}>
            ${Number(appointment.servicePrice || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="card-outline" size={20} />
          <Text style={styles.label}>Payment:</Text>
          <Text style={styles.value}>
            {appointment.paymentStatus || 'Pending'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.blueButton}>
            <Text style={styles.blueText}>Add to Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.blueButton} onPress={handleTip}>
            <Text style={styles.blueText}>Tip</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.reviewButton} onPress={handleReview}>
          <Text style={styles.reviewText}>Leave or Update Review</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.greenButton} onPress={handlePay}>
          <Text style={styles.greenText}>
            Pay ${Number(appointment.servicePrice || 0).toFixed(2)}
          </Text>
        </TouchableOpacity>

        <Text style={styles.subText}>
          Pay after service is completed
        </Text>

        {appointment.status === 'confirmed' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelText}>Cancel Appointment</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  content: { padding: 20 },
  header: { fontSize: 26, fontWeight: '700', marginBottom: 20 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 6,
  },

  label: { fontWeight: '600', marginLeft: 6 },
  value: { marginLeft: 6 },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 20,
  },

  blueButton: {
    backgroundColor: '#2E86DE',
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 10,
  },

  blueText: { color: '#fff', fontWeight: '600' },

  reviewButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },

  reviewText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  greenButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },

  greenText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  subText: {
    textAlign: 'center',
    color: '#777',
    marginBottom: 30,
  },

  cancelButton: {
    backgroundColor: '#F44336',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },

  cancelText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
