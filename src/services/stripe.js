import { Platform } from 'react-native';
// import { initStripe, useStripe, initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
// import { StripeProvider } from '@stripe/stripe-react-native';
import { initStripe, useStripe } from '@stripe/stripe-react-native';
const { initPaymentSheet, presentPaymentSheet } = useStripe();

import Constants from 'expo-constants';
import { db } from '@/services/firebase';
import { doc, setDoc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';


const extra = Constants.expoConfig?.extra;
 
// Get Stripe publishable key from environment
const STRIPE_PUBLISHABLE_KEY = extra?.stripePublishableKey
console.log("me: ",STRIPE_PUBLISHABLE_KEY);

// Debug logging
console.log('🔑 Stripe Configuration Check:');
console.log('- process.env.STRIPE_PUBLISHABLE_KEY:', !!process.env.STRIPE_PUBLISHABLE_KEY);
console.log('- Constants.expoConfig?.extra?.STRIPE_PUBLISHABLE_KEY:', !!Constants.expoConfig?.extra?.STRIPE_PUBLISHABLE_KEY);
console.log('- Final STRIPE_PUBLISHABLE_KEY loaded:', !!STRIPE_PUBLISHABLE_KEY);
console.log('- Key starts with pk_test:', STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test'));
console.log('- Key length:', STRIPE_PUBLISHABLE_KEY?.length);

if (!STRIPE_PUBLISHABLE_KEY) {
  console.error('⚠️ STRIPE_PUBLISHABLE_KEY not configured properly');
  throw new Error('Stripe publishable key is required');
}

// Initialize Stripe
export const initializeStripe = async () => {
  try {
    await initStripe({
      publishableKey: STRIPE_PUBLISHABLE_KEY,
      merchantIdentifier: 'merchant.com.barberapp',
      urlScheme: 'barberapp',
    });
    console.log('✅ Stripe initialized successfully');
  } catch (error) {
    console.error('Error initializing Stripe:', error);
    throw error;
  }
};

// Create PaymentIntent via backend
const createPaymentIntent = async (amount, description, metadata) => {
  try {
    const BACKEND_URL = 'https://barber-backend-ten.vercel.app';
    
    console.log('🔧 Calling backend to create payment intent...');
    
    const response = await fetch(`${BACKEND_URL}/api/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount, // Send $20 as 20, let backend convert to cents
        currency: 'usd',
        description,
        metadata,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Backend error:', data);
      throw new Error(data.error || 'Failed to create payment intent');
    }
    
    console.log('✅ Payment intent created successfully:', data.paymentIntentId);
    return data;
    
  } catch (error) {
    console.error('Error calling backend:', error);
    throw new Error('Failed to create payment intent');
  }
};

// Create and present payment sheet for service payment
export const createAndPresentServicePaymentSheet = async (userId, barberId, appointmentId, amount, description = 'Barber Service') => {
  try {
    console.log('🏦 Creating payment intent for service payment...', { amount, appointmentId });
    
    // Step 1: Call backend to create PaymentIntent
    const paymentIntentResponse = await createPaymentIntent(amount, description, {
      userId,
      barberId,
      appointmentId
    });
    
    const { clientSecret, ephemeralKey, customer, paymentIntentId } = paymentIntentResponse;
    
    // Step 2: Initialize the payment sheet
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'Barber Services',
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: clientSecret,
      allowsDelayedPaymentMethods: false,
      defaultBillingDetails: {
        name: 'Customer',
      },
      returnURL: 'barberapp://payment-return',
    });
    
    if (initError) {
      console.error('Error initializing payment sheet:', initError);
      throw new Error(`Payment initialization failed: ${initError.message}`);
    }
    
    // Step 3: Present the payment sheet
    const { error: presentError } = await presentPaymentSheet();
    
    if (presentError) {
      if (presentError.code === 'Canceled') {
        return { success: false, canceled: true };
      }
      console.error('Error presenting payment sheet:', presentError);
      throw new Error(`Payment failed: ${presentError.message}`);
    }
    
    // Step 4: Payment successful, update Firestore
    console.log('💳 Payment completed successfully!');
    
    // Create payment record
    const paymentRef = await addDoc(collection(db, 'payments'), {
      customerId: userId,
      barberId,
      appointmentId,
      amount,
      description,
      type: 'service',
      status: 'completed',
      stripePaymentIntentId: paymentIntentId,
      createdAt: serverTimestamp(),
      paymentMethod: 'card'
    });
    
    // Record the transaction
    await addDoc(collection(db, 'transactions'), {
      userId,
      barberId,
      appointmentId,
      paymentId: paymentRef.id,
      type: 'service_payment',
      amount,
      description,
      status: 'completed',
      stripePaymentIntentId: paymentIntentId,
      createdAt: serverTimestamp()
    });
    
    // Update appointment with payment status
    const appointmentRef = doc(db, 'appointments', appointmentId);
    await updateDoc(appointmentRef, {
      paymentStatus: 'paid',
      paidAmount: amount,
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Payment and records updated successfully');
    
    return { 
      success: true, 
      paymentId: paymentRef.id,
      paymentIntentId: paymentIntentId
    };
    
  } catch (error) {
    console.error('Error in payment flow:', error);
    throw error;
  }
};

// Create subscription with setup intent for future payments
export const createSubscriptionPaymentSheet = async (userId, priceId) => {
  try {
    console.log('🔔 Creating subscription setup for user:', userId);
    
    // Step 1: Call backend to create PaymentIntent for subscription
    const paymentIntentResponse = await createPaymentIntent(30, 'Barber Subscription - First Month', {
      userId,
      type: 'subscription',
      priceId
    });
    
    const { clientSecret, ephemeralKey, customer, paymentIntentId } = paymentIntentResponse;
    
    // Step 2: Initialize the payment sheet
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'Barber Services',
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: clientSecret,
      allowsDelayedPaymentMethods: false,
      defaultBillingDetails: {
        name: 'Barber Subscription',
      },
      returnURL: 'barberapp://subscription-return',
    });
    
    if (initError) {
      console.error('Error initializing payment sheet:', initError);
      throw new Error(`Payment initialization failed: ${initError.message}`);
    }
    
    // Step 3: Present the payment sheet
    const { error: presentError } = await presentPaymentSheet();
    
    if (presentError) {
      if (presentError.code === 'Canceled') {
        return { success: false, canceled: true };
      }
      console.error('Error presenting payment sheet:', presentError);
      throw new Error(`Payment failed: ${presentError.message}`);
    }
    
    // Step 4: Payment successful, create subscription records
    console.log('💳 Subscription payment completed successfully!');
    
    const subscriptionId = 'sub_' + Date.now();
    
    // Create subscription payment record
    const paymentRef = await addDoc(collection(db, 'payments'), {
      customerId: userId,
      subscriptionId,
      amount: 30,
      description: 'Barber Subscription - First Month',
      type: 'subscription',
      status: 'completed',
      stripePaymentIntentId: paymentIntentId,
      createdAt: serverTimestamp(),
      paymentMethod: 'card'
    });
    
    // Record the subscription transaction
    await addDoc(collection(db, 'transactions'), {
      userId,
      subscriptionId,
      paymentId: paymentRef.id,
      type: 'subscription_payment',
      amount: 30,
      description: 'Barber Subscription - First Month',
      status: 'completed',
      stripePaymentIntentId: paymentIntentId,
      createdAt: serverTimestamp()
    });
    
    // Store subscription info in user document
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      subscription: {
        status: 'active',
        plan: 'barber_monthly',
        subscriptionId,
        stripePaymentIntentId: paymentIntentId,
        startDate: new Date().toISOString(),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        amount: 30,
        currency: 'usd',
        priceId: priceId,
        type: 'manual_billing'
      },
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Subscription stored in Firestore');
    
    return { 
      success: true, 
      subscriptionId,
      paymentIntentId: paymentIntentId
    };
    
  } catch (error) {
    console.error('Error in subscription setup:', error);
    throw error;
  }
};

// Create payment sheet for tip
export const createTipPaymentSheet = async (userId, amount, appointmentId) => {
  try {
    const response = await createPaymentIntent(amount, 'Tip', { userId, appointmentId, type: 'tip' });
    return response;
  } catch (error) {
    console.error('Error creating tip payment sheet:', error);
    throw error;
  }
};

// Get subscription status
export const getSubscriptionStatus = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      if (userData.subscription && userData.subscription.status === 'active') {
        const endDate = new Date(userData.subscription.endDate);
        const now = new Date();
        
        if (endDate < now) {
          await updateDoc(userRef, {
            'subscription.status': 'expired',
            updatedAt: serverTimestamp()
          });
          
          return { status: 'expired' };
        }
        
        return { 
          status: 'active',
          endDate: userData.subscription.endDate,
          plan: userData.subscription.plan
        };
      }
      
      return { status: 'inactive' };
    }
    
    return { status: 'inactive' };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    throw error;
  }
};

// Check if appointment has been paid
export const getAppointmentPaymentStatus = async (appointmentId) => {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(appointmentRef);
    
    if (appointmentDoc.exists()) {
      const data = appointmentDoc.data();
      return {
        isPaid: data.paymentStatus === 'paid',
        amount: data.paidAmount || 0,
        paidAt: data.paidAt || null
      };
    }
    
    return { isPaid: false, amount: 0, paidAt: null };
  } catch (error) {
    console.error('Error checking payment status:', error);
    return { isPaid: false, amount: 0, paidAt: null };
  }
};

export default {
  initializeStripe,
  createSubscriptionPaymentSheet,
  createTipPaymentSheet,
  createAndPresentServicePaymentSheet,
  getSubscriptionStatus,
  getAppointmentPaymentStatus
};
