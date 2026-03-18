import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe, createTipPaymentSheet } from '@/services/stripe';
import { auth, getUserProfile, getCustomerAppointments, db } from '@/services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter, useLocalSearchParams } from 'expo-router';


const TipScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const stripe = useStripe();

  const safeParse = (input) => {
    if (!input) return null;
    try {
      return typeof input === 'string' ? JSON.parse(input) : input;
    } catch (_err) {
      return null;
    }
  };

  const appointment = safeParse(params.appointment);
  const [resolvedAppointment, setResolvedAppointment] = useState(appointment || null);
  const appointmentIdParam = params?.appointmentId ? String(params.appointmentId) : null;
  
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Tip options
  const [selectedTip, setSelectedTip] = useState(null);
  const [customTip, setCustomTip] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(null);
  
  const tipOptions = [
    { percent: 15, label: '15%' },
    { percent: 20, label: '20%' },
    { percent: 25, label: '25%' },
  ];

  const normalizeCurrencyValue = (input) => {
    if (typeof input === 'number') {
      return Number.isFinite(input) ? input : 0;
    }

    if (typeof input === 'string') {
      const cleaned = input.replace(/[^0-9.-]/g, '');
      if (!cleaned) return 0;
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    // Priority:
    // 1) appointment passed via params
    // 2) explicit appointmentId param fetch
    // 3) fallback to latest non-cancelled appointment only when no explicit selection was passed
    const loadAppointment = async () => {
      try {
        if (resolvedAppointment) return;
        const user = auth.currentUser;
        if (!user?.uid) return;

        if (appointmentIdParam) {
          const snap = await getDoc(doc(db, 'appointments', appointmentIdParam));
          if (snap.exists()) {
            setResolvedAppointment({ id: snap.id, ...snap.data() });
            return;
          }
          setError('The selected appointment was not found.');
          return;
        }

        const appts = await getCustomerAppointments(user.uid);
        if (Array.isArray(appts) && appts.length > 0) {
          const candidates = appts.filter((a) => a && a.status !== 'cancelled');
          candidates.sort((a, b) => {
            const da = new Date(`${a.date}T${a.time}`);
            const db = new Date(`${b.date}T${b.time}`);
            return db - da; // latest first
          });
          if (candidates[0]) setResolvedAppointment(candidates[0]);
        }
      } catch (e) {
        console.warn('Failed to load fallback appointment for tip:', e);
      }
    };
    loadAppointment();
  }, [resolvedAppointment, appointmentIdParam]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      
      const user = auth.currentUser;
      if (user?.uid) {
        await getUserProfile(user.uid);
      }
      
      // In a real app, you would fetch saved payment methods
      // For this demo, we'll use a placeholder
      setPaymentMethod({
        id: 'pm_mock',
        brand: 'visa',
        last4: '4242',
      });
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const handleTipSelect = (tipOption) => {
    setSelectedTip(tipOption);
    setCustomTip('');
  };

  const handleCustomTipChange = (value) => {
    setCustomTip(value);
    setSelectedTip(null);
  };

  const calculateTipAmount = () => {
    const appt = resolvedAppointment;
    const servicePrice = normalizeCurrencyValue(
      appt?.servicePrice ?? appt?.price ?? 0
    );
    
    if (selectedTip) {
      return (servicePrice * selectedTip.percent) / 100;
    }
    
    if (customTip) {
      return normalizeCurrencyValue(customTip);
    }
    
    return 0;
  };

  const handleSubmitTip = async () => {
    const tipAmount = calculateTipAmount();
    
    if (!Number.isFinite(tipAmount) || tipAmount <= 0) {
      Alert.alert('Error', 'Please select or enter a valid tip amount');
      return;
    }

    try {
      setProcessing(true);

      const userId = auth.currentUser?.uid || null;
      const appointmentId = resolvedAppointment?.id || null;
      const barberId = resolvedAppointment?.barberId || null;

      // Create PaymentIntent for tip
      const pi = await createTipPaymentSheet(
        userId,
        tipAmount,
        appointmentId,
        barberId
      );

      // Initialize and present payment sheet
      const { error: initError } = await stripe.initPaymentSheet({
        merchantDisplayName: 'Barber Tips',
        customerId: pi.customer,
        customerEphemeralKeySecret: pi.ephemeralKey,
        paymentIntentClientSecret: pi.clientSecret,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: { name: 'Customer' },
        returnURL: 'barberclean://payment-return',
      });
      if (initError) {
        throw new Error(`Payment init failed: ${initError.message}`);
      }

      const { error: presentError } = await stripe.presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') {
          setError('Payment was canceled.');
          return;
        }
        throw new Error(`Payment failed: ${presentError.message}`);
      }

      // Record tip in Firestore
      try {
        const paymentRef = await addDoc(collection(db, 'payments'), {
          customerId: userId,
          barberId,
          appointmentId,
          amount: tipAmount,
          description: 'Tip',
          type: 'tip',
          status: 'completed',
          stripePaymentIntentId: pi.paymentIntentId,
          createdAt: serverTimestamp(),
          paymentMethod: 'card',
        });

        if (appointmentId) {
          const apptRef = doc(db, 'appointments', appointmentId);
          await updateDoc(apptRef, {
            tip: tipAmount,
            updatedAt: serverTimestamp(),
          });
        }
        console.log('Tip recorded, paymentId:', paymentRef.id);
      } catch (persistErr) {
        console.warn('Tip persisted with error (non-fatal):', persistErr);
      }

      Alert.alert(
        'Tip Sent',
        `Your $${tipAmount.toFixed(2)} tip has been sent to ${resolvedAppointment?.barberName || 'the barber'}. Thank you!`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error processing tip:', error);
      setError(error?.message || 'Failed to process tip payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleSkipTip = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading payment information...</Text>
      </View>
    );
  }

  if (!resolvedAppointment) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
        <Text style={styles.loadingText}>No appointment data found for tipping.</Text>
        <TouchableOpacity style={styles.skipButton} onPress={router.back}>
          <Text style={styles.skipButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const safeNumber = (n) => normalizeCurrencyValue(n);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add a Tip</Text>
        <Text style={styles.subtitle}>
          Show your appreciation for great service
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.appointmentCard}>
        <Text style={styles.cardTitle}>Appointment Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Barber:</Text>
          <Text style={styles.detailValue}>{resolvedAppointment.barberName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Service:</Text>
          <Text style={styles.detailValue}>{resolvedAppointment.serviceName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price:</Text>
          <Text style={styles.detailValue}>${safeNumber(resolvedAppointment.servicePrice).toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.tipSection}>
        <Text style={styles.sectionTitle}>Select Tip Amount</Text>
        
        <View style={styles.tipOptionsContainer}>
          {tipOptions.map((option) => (
            <TouchableOpacity
              key={option.percent}
              style={[
                styles.tipOption,
                selectedTip === option && styles.selectedTipOption
              ]}
              onPress={() => handleTipSelect(option)}
            >
              <Text style={[
                styles.tipOptionLabel,
                selectedTip === option && styles.selectedTipLabel
              ]}>
                {option.label}
              </Text>
              <Text style={[
                styles.tipOptionAmount,
                selectedTip === option && styles.selectedTipLabel
              ]}>
                ${((safeNumber(resolvedAppointment.servicePrice) * option.percent) / 100).toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.customTipContainer}>
          <Text style={styles.customTipLabel}>Custom Amount:</Text>
          <View style={styles.customTipInputContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.customTipInput}
              value={customTip}
              onChangeText={handleCustomTipChange}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>

      <View style={styles.paymentSection}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        
        {paymentMethod ? (
          <View style={styles.paymentMethodCard}>
            <Ionicons name={paymentMethod.brand === 'visa' ? 'card' : 'card-outline'} size={24} color="#2196F3" />
            <Text style={styles.paymentMethodText}>
              {paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)} ending in {paymentMethod.last4}
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.addPaymentButton}>
            <Ionicons name="add-circle" size={20} color="#2196F3" />
            <Text style={styles.addPaymentText}>Add Payment Method</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>Tip Amount:</Text>
        <Text style={styles.totalAmount}>${calculateTipAmount().toFixed(2)}</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleSkipTip}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.submitButton,
            (calculateTipAmount() <= 0 || processing || !paymentMethod) && styles.disabledButton
          ]}
          onPress={handleSubmitTip}
          disabled={calculateTipAmount() <= 0 || processing || !paymentMethod}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Send Tip</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 48, // or 56 for even lower
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    color: '#f44336',
    padding: 16,
    textAlign: 'center',
  },
  appointmentCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: '500',
    width: 80,
  },
  detailValue: {
    flex: 1,
  },
  tipSection: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tipOption: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedTipOption: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  tipOptionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tipOptionAmount: {
    fontSize: 14,
    color: '#666',
  },
  selectedTipLabel: {
    color: '#fff',
  },
  customTipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  customTipLabel: {
    fontSize: 16,
    marginRight: 8,
    flex: 1,
  },
  customTipInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  currencySymbol: {
    fontSize: 16,
    marginRight: 4,
  },
  customTipInput: {
    fontSize: 16,
    flex: 1,
  },
  paymentSection: {
    margin: 16,
    marginTop: 0,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  paymentMethodText: {
    fontSize: 16,
    marginLeft: 12,
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  addPaymentText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  actionButtons: {
    flexDirection: 'row',
    margin: 16,
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
});

export default TipScreen;
