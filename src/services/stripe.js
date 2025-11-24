import { Platform, Linking } from 'react-native';
import { initStripe, useStripe } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import { db } from '@/services/firebase';
import { doc, setDoc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';


const extra = Constants.expoConfig?.extra;

// Get Stripe publishable key from environment (EAS) or extra fallback
const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || extra?.stripePublishableKey;
console.log('me (STRIPE_PUBLISHABLE_KEY):', STRIPE_PUBLISHABLE_KEY);

// Debug logging
console.log('🔑 Stripe Configuration Check:');
console.log(
  '- process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY:',
  !!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
);
console.log('- Constants.expoConfig?.extra?.stripePublishableKey:', !!extra?.stripePublishableKey);
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
const createPaymentIntent = async (amount, description, metadata, customerEmail = null) => {
  try {
    const BACKEND_URL = extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;
    
    console.log('🔧 Calling backend to create payment intent...');
    console.log('🔧 Backend URL:', BACKEND_URL);
    console.log('🔧 Amount:', amount, 'Description:', description);
    console.log('🔧 Metadata:', metadata);
    console.log('🔧 Customer Email:', customerEmail);
    
    const requestBody = {
      amount: amount, // Send $20 as 20, let backend convert to cents
      currency: 'usd',
      description,
      metadata,
    };
    
    // Add customer_email if provided
    if (customerEmail) {
      requestBody.customer_email = customerEmail;
    }
    
    const response = await fetch(`${BACKEND_URL}/api/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Backend error:', data);
      throw new Error(data.error || 'Failed to create payment intent');
    }
    
    console.log('✅ Payment intent created successfully:', data.paymentIntentId);
    console.log('🔍 clientSecret exists:', !!data.clientSecret);
    console.log('🔍 ephemeralKey exists:', !!data.ephemeralKey);
    console.log('🔍 customer exists:', !!data.customer);
    console.log('🔍 ephemeralKey type:', typeof data.ephemeralKey);
    console.log('🔍 customer type:', typeof data.customer);
    
    // Extract the actual values we need
    const result = {
      clientSecret: data.clientSecret,
      ephemeralKey: typeof data.ephemeralKey === 'string' ? data.ephemeralKey : data.ephemeralKey?.secret,
      customer: typeof data.customer === 'string' ? data.customer : data.customer?.id,
      paymentIntentId: data.paymentIntentId
    };
    
    console.log('🔍 Extracted values:', result);
    return result;
    
  } catch (error) {
    console.error('Error calling backend:', error);
    throw new Error('Failed to create payment intent');
  }
};

// Create Stripe Connect account for barber
const createConnectAccount = async (userId, email) => {
  try {
    const BACKEND_URL = extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;
    
    console.log('🔗 Creating Stripe Connect account for barber...');
    console.log('🔗 Backend URL:', BACKEND_URL);
    console.log('🔗 User ID:', userId, 'Email:', email);
    console.log('🔗 Full URL:', `${BACKEND_URL}/api/create-connect-account`);
    
    const requestBody = {
      userId,
      email,
      businessType: 'individual'
    };
    console.log('🔗 Request body:', JSON.stringify(requestBody));
    
    const response = await fetch(`${BACKEND_URL}/api/create-connect-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('🔗 Response status:', response.status);
    console.log('🔗 Response ok:', response.ok);
    console.log('🔗 Response headers:', JSON.stringify([...response.headers]));
    
    const responseText = await response.text();
    console.log('🔗 Raw response text:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('🔗 Parsed response data:', JSON.stringify(data));
    } catch (parseError) {
      console.error('🔗 Failed to parse response as JSON:', parseError);
      throw new Error('Invalid response from backend: ' + responseText);
    }
    
    if (!response.ok) {
      console.error('Backend error:', data);
      throw new Error(data.error || 'Failed to create Connect account');
    }
    
    console.log('✅ Connect account created:', data.accountId);
    return data;
    
  } catch (error) {
    console.error('Error creating Connect account:', error);
    throw new Error('Failed to create Connect account');
  }
};

// Create and present payment sheet for service payment
export const createAndPresentServicePaymentSheet = async (stripeHook, userId, barberId, appointmentId, amount, description = 'Barber Service') => {
  try {
    console.log('🏦 Creating payment intent for service payment...', { amount, appointmentId });
    
    const { initPaymentSheet, presentPaymentSheet } = stripeHook;
    
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
export const createSubscriptionPaymentSheet = async (stripeHook, userId, priceId, userEmail) => {
  try {
    console.log('🔔 Creating subscription setup for user:', userId);
    
    const { initPaymentSheet, presentPaymentSheet } = stripeHook;
    
    // Step 1: Call backend to create PaymentIntent for subscription
    const paymentIntentResponse = await createPaymentIntent(30, 'Barber Subscription - First Month', {
      userId,
      type: 'subscription',
      priceId
    }, userEmail);
    
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
    console.log('📝 Created subscription ID:', subscriptionId);
    
    // Create subscription payment record
    console.log('📝 Step 1: Creating payment record in Firestore...');
    let paymentRef;
    try {
      paymentRef = await addDoc(collection(db, 'payments'), {
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
      console.log('✅ Payment record created:', paymentRef.id);
    } catch (error) {
      console.error('❌ Step 1 ERROR:', error.message);
      console.error('❌ Step 1 ERROR CODE:', error.code);
      throw error;
    }
    
    // Record the subscription transaction
    console.log('📝 Step 2: Creating transaction record in Firestore...');
    try {
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
      console.log('✅ Transaction record created');
    } catch (error) {
      console.error('❌ Step 2 ERROR:', error.message);
      console.error('❌ Step 2 ERROR CODE:', error.code);
      throw error;
    }
    
    // Store subscription info in user document
    console.log('📝 Step 3: Updating user document with subscription...');
    const userRef = doc(db, 'users', userId);
    try {
      await setDoc(userRef, {
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
      }, { merge: true });
      console.log('✅ User document updated');
    } catch (error) {
      console.error('❌ Step 3 ERROR:', error.message);
      console.error('❌ Step 3 ERROR CODE:', error.code);
      console.error('❌ Step 3 FULL ERROR:', JSON.stringify(error));
      throw error;
    }
    
    console.log('✅ Subscription stored in Firestore');
    
    // Step 5: Create Stripe Connect account for barber to receive payments
    let connectAccountId = null;
    let onboardingUrl = null;
    
    try {
      console.log('🔗 Setting up Connect account for barber...');
      const connectResponse = await createConnectAccount(userId, userEmail);
      connectAccountId = connectResponse.accountId;
      onboardingUrl = connectResponse.onboardingUrl;
      
      // Store Connect account ID in Firestore
      await setDoc(userRef, {
        'stripeConnectAccountId': connectAccountId,
        'stripeConnectOnboardingComplete': false,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log('✅ Connect account ID stored in Firestore');
      
    } catch (connectError) {
      console.error('⚠️ Error creating Connect account (non-fatal):', connectError);
      // Don't fail the whole flow if Connect fails
    }
    
    return { 
      success: true, 
      subscriptionId,
      paymentIntentId: paymentIntentId,
      connectAccountId,
      onboardingUrl
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

// Export useStripe hook for components to use
export { useStripe };

export default {
  initializeStripe,
  createSubscriptionPaymentSheet,
  createTipPaymentSheet,
  createAndPresentServicePaymentSheet,
  getSubscriptionStatus,
  getAppointmentPaymentStatus,
  useStripe
};
