import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { processPayment } from '@/services/stripe';
import { getUserProfile, updateUserProfile } from '@/services/firebase';


const TipScreen = ({ route, navigation }) => {
  const { appointment } = route.params;
  
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

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      
      const user = auth.currentUser;
      const userProfile = await getUserProfile(user.uid);
      
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
    const servicePrice = appointment.servicePrice || 0;
    
    if (selectedTip) {
      return (servicePrice * selectedTip.percent) / 100;
    }
    
    if (customTip) {
      const tipValue = parseFloat(customTip);
      return isNaN(tipValue) ? 0 : tipValue;
    }
    
    return 0;
  };

  const handleSubmitTip = async () => {
    const tipAmount = calculateTipAmount();
    
    if (tipAmount <= 0) {
      Alert.alert('Error', 'Please select or enter a valid tip amount');
      return;
    }

    try {
      setProcessing(true);
      
      // In a real app, you would process the payment through your backend
      // For this demo, we'll simulate a successful payment
      await processPayment(paymentMethod.id, tipAmount * 100);
      
      Alert.alert(
        'Tip Sent',
        `Your $${tipAmount.toFixed(2)} tip has been sent to ${appointment.barberName}. Thank you!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error processing tip:', error);
      setError('Failed to process tip payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleSkipTip = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading payment information...</Text>
      </View>
    );
  }

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
          <Text style={styles.detailValue}>{appointment.barberName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Service:</Text>
          <Text style={styles.detailValue}>{appointment.serviceName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price:</Text>
          <Text style={styles.detailValue}>${appointment.servicePrice.toFixed(2)}</Text>
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
                ${((appointment.servicePrice * option.percent) / 100).toFixed(2)}
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
