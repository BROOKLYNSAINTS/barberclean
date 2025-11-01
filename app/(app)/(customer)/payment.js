import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStripe } from "@/services/stripe";
import { auth } from '@/services/firebase';
import { createAndPresentServicePaymentSheet } from '@/services/stripe';
import { SafeAreaView } from 'react-native-safe-area-context';

const PaymentScreen = () => {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  // Parse parameters
  const params = useLocalSearchParams();
  const appointmentId = params.appointmentId;
  const barberId = params.barberId;
  const amount = parseFloat(params.amount) || 0;
  const serviceName = params.serviceName || 'Barber Service';
  const barberName = params.barberName || 'Barber';
  
  const [loading, setLoading] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);

  useEffect(() => {
    initializePaymentSheet();
  }, []);

  const initializePaymentSheet = async () => {
    try {
      setLoading(true);
      
      // This would call your backend to create a payment intent
      // For now, we'll show the setup
      console.log('Initializing payment for:', {
        appointmentId,
        barberId,
        amount,
        serviceName
      });
      
      setPaymentReady(true);
    } catch (error) {
      console.error('Error initializing payment:', error);
      Alert.alert('Error', 'Could not initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentReady) {
      Alert.alert('Error', 'Payment not ready. Please try again.');
      return;
    }

    try {
      setLoading(true);
      
      const result = await createAndPresentServicePaymentSheet(
        auth.currentUser?.uid,
        barberId,
        appointmentId,
        amount,
        `${serviceName} - ${barberName}`
      );

      if (result.success) {
        Alert.alert(
          'Payment Successful!',
          `Your payment of $${amount.toFixed(2)} has been processed successfully.`,
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else if (result.canceled) {
        console.log('Payment canceled by user');
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      let errorMessage = 'Payment failed. Please try again.';
      if (error.message.includes('backend call')) {
        errorMessage = 'Payment system needs backend configuration. This is demo mode.';
      }
      
      Alert.alert('Payment Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = () => {
    Alert.alert(
      'Payment Method',
      'Choose your payment method:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Credit/Debit Card', 
          onPress: handlePayment 
        },
        // You can add more payment methods here like Apple Pay, Google Pay
      ]
    );
  };

  if (loading && !paymentReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Setting up payment...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          {/* <Text style={styles.title}>Payment</Text> */}
        </View>

        <View style={styles.serviceInfo}>
          <Text style={styles.serviceTitle}>{serviceName}</Text>
          <Text style={styles.barberName}>with {barberName}</Text>
          <Text style={styles.amount}>${amount.toFixed(2)}</Text>
        </View>

        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service</Text>
            <Text style={styles.summaryValue}>${amount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Processing Fee</Text>
            <Text style={styles.summaryValue}>$0.00</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${amount.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={[styles.payButton, loading && styles.disabledButton]} 
            onPress={handleCardPayment}
            disabled={loading || !paymentReady}
          >
            <Ionicons name="card" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.payButtonText}>
              {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
            {' '}Your payment is secured by Stripe
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By completing this payment, you agree to our terms of service.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'column',
    alignItems: 'center', // Center horizontally
    paddingTop: 72,       // Space above header
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    alignSelf: 'flex-start', // Keep back button on the left
    marginBottom: 8,
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24, // Increase this for more space below back button
  },
  serviceInfo: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  barberName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  paymentSection: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonSection: {
    margin: 20,
    alignItems: 'center',
  },
  payButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonIcon: {
    marginRight: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  securityNote: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PaymentScreen;
