import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  auth,
  getUserProfile,
  getAppointmentReview,
  upsertBarberReview,
} from '@/services/firebase';

function safeParse(input) {
  if (!input) return null;
  try {
    return typeof input === 'string' ? JSON.parse(input) : input;
  } catch {
    return null;
  }
}

export default function ReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const appointment = safeParse(params.appointment);

  const appointmentId = appointment?.id || params.appointmentId || null;
  const barberId = appointment?.barberId || params.barberId || null;
  const barberName = appointment?.barberName || 'Barber';
  const serviceName = appointment?.serviceName || 'Service';

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  const canSubmit = useMemo(() => {
    return Number.isFinite(rating) && rating >= 1 && reviewText.trim().length > 0;
  }, [rating, reviewText]);

  useEffect(() => {
    const loadReview = async () => {
      try {
        if (!appointmentId || !barberId) {
          Alert.alert('Review Error', 'Missing appointment or barber information.');
          router.back();
          return;
        }

        const existing = await getAppointmentReview(barberId, appointmentId);
        if (existing) {
          const parsedRating = Number(existing.rating);
          setRating(Number.isFinite(parsedRating) ? parsedRating : 0);
          setReviewText(existing.text || '');
          setHasExistingReview(true);
        }
      } catch (error) {
        Alert.alert('Review Error', error?.message || 'Failed to load review');
      } finally {
        setLoading(false);
      }
    };

    loadReview();
  }, [appointmentId, barberId, router]);

  const handleSave = async () => {
    try {
      if (!canSubmit) {
        Alert.alert('Invalid Review', 'Please add a star rating and review text.');
        return;
      }

      const customerId = auth.currentUser?.uid;
      if (!customerId) {
        throw new Error('Please sign in to submit a review');
      }

      setSaving(true);

      const profile = await getUserProfile(customerId);
      const customerName =
        profile?.name ||
        profile?.fullName ||
        auth.currentUser?.displayName ||
        'Anonymous';

      await upsertBarberReview({
        barberId,
        customerId,
        appointmentId,
        rating,
        text: reviewText,
        customerName,
        serviceName,
      });

      Alert.alert(
        hasExistingReview ? 'Review Updated' : 'Review Submitted',
        `Your review for ${barberName} was saved successfully.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Review Error', error?.message || 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading review...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{hasExistingReview ? 'Update Review' : 'Leave a Review'}</Text>
        <Text style={styles.subtitle}>{serviceName} with {barberName}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Rating</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color="#FFD700"
                  style={styles.star}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Your Review</Text>
          <TextInput
            style={styles.input}
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="Share details about your haircut experience"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={400}
          />
          <Text style={styles.counter}>{reviewText.length}/400</Text>

          <TouchableOpacity
            style={[styles.saveButton, (!canSubmit || saving) && styles.disabledButton]}
            onPress={handleSave}
            disabled={!canSubmit || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {hasExistingReview ? 'Update Review' : 'Submit Review'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 10,
  },
  starRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  star: {
    marginRight: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    minHeight: 130,
    padding: 12,
    backgroundColor: '#fff',
  },
  counter: {
    marginTop: 6,
    marginBottom: 14,
    textAlign: 'right',
    color: '#888',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: '#2E86DE',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
