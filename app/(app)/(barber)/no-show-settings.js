import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, db, getUserProfile } from '@/services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

export default function NoShowSettingsScreen() {
  const router = useRouter();

  const [enabled, setEnabled] = useState(false);
  const [feeType, setFeeType] = useState('flat'); // flat | percent
  const [feeAmount, setFeeAmount] = useState('25'); // dollars or percent
  const [windowHours, setWindowHours] = useState(24);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const profile = await getUserProfile(user.uid);
        const ns = profile?.noShowSettings || {};

        setEnabled(!!ns.enabled);
        setFeeType(ns.feeType === 'percent' ? 'percent' : 'flat');
        setFeeAmount(String(ns.feeAmount ?? 25));
        setWindowHours(
          typeof ns.cancellationWindowHours === 'number'
            ? ns.cancellationWindowHours
            : 24
        );
      } catch (err) {
        console.warn('Failed to load no-show settings:', err);
      }
    })();
  }, []);

  const save = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in.');
        return;
      }

      setSaving(true);

      const raw = Number(feeAmount);
      const parsedAmount = clamp(
        Number.isFinite(raw) ? raw : 25,
        1,
        feeType === 'percent' ? 100 : 500
      );

      await updateDoc(doc(db, 'users', user.uid), {
        noShowSettings: {
          enabled,
          feeType,
          feeAmount: parsedAmount,
          cancellationWindowHours: windowHours,
          updatedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Saved', 'No-show settings updated.');
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err?.message || 'Failed to save no-show settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>No-Show Protection</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Enable / Disable */}
      <TouchableOpacity
        style={[styles.toggle, enabled ? styles.toggleOn : styles.toggleOff]}
        onPress={() => setEnabled((v) => !v)}
      >
        <Text style={styles.toggleText}>{enabled ? 'Enabled' : 'Disabled'}</Text>
      </TouchableOpacity>

      {/* Fee Type */}
      <Text style={styles.sectionTitle}>Fee Type</Text>
      <View style={styles.row}>
        {['flat', 'percent'].map((type) => {
          const selected = feeType === type;
          return (
            <TouchableOpacity
              key={type}
              onPress={() => setFeeType(type)}
              style={[styles.segment, selected && styles.segmentActive]}
            >
              <Text
                style={[
                  styles.segmentText,
                  selected && styles.segmentTextActive,
                ]}
              >
                {type === 'flat' ? 'Flat $' : 'Percent %'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Fee Amount */}
      <Text style={styles.sectionTitle}>
        Amount ({feeType === 'percent' ? '%' : '$'})
      </Text>
      <TextInput
        value={feeAmount}
        onChangeText={setFeeAmount}
        keyboardType="numeric"
        style={styles.input}
      />

      {/* Cancellation Window */}
      <Text style={styles.sectionTitle}>Cancellation Window</Text>

      {[
        { label: '24 hours before', value: 24 },
        { label: '12 hours before', value: 12 },
        { label: '2 hours before', value: 2 },
        { label: 'Same day', value: 0 },
      ].map((opt) => {
        const selected = windowHours === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setWindowHours(opt.value)}
            style={[styles.option, selected && styles.optionActive]}
          >
            <Text style={[styles.optionText, selected && styles.optionTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Save */}
      <TouchableOpacity
        style={[styles.save, saving && { opacity: 0.6 }]}
        onPress={save}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Settings'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  toggle: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleOn: { backgroundColor: '#4CAF50' },
  toggleOff: { backgroundColor: '#ccc' },
  toggleText: { color: '#fff', fontWeight: '700' },

  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '700',
  },

  row: { flexDirection: 'row', gap: 12 },

  segment: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  segmentText: { color: '#333' },
  segmentTextActive: { color: '#2196F3', fontWeight: '700' },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },

  option: {
    marginTop: 8,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  optionActive: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  optionText: { color: '#333' },
  optionTextActive: { color: '#2196F3', fontWeight: '700' },

  save: {
    marginTop: 32,
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
