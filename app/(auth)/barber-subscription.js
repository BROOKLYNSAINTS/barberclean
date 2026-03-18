import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as InAppPurchases from 'expo-in-app-purchases';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '@/services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const PRODUCT_ID = 'com.schedulesync.barber.monthly';

export default function BarberSubscriptionScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [productReady, setProductReady] = useState(false);

  useEffect(() => {
    async function initIAP() {
      try {
        await InAppPurchases.connectAsync();

        const { responseCode, results } =
          await InAppPurchases.getProductsAsync([PRODUCT_ID]);

        if (
          responseCode === InAppPurchases.IAPResponseCode.OK &&
          results.length > 0
        ) {
          setProductReady(true);
        }

        InAppPurchases.setPurchaseListener(async ({ responseCode, results }) => {
          if (responseCode === InAppPurchases.IAPResponseCode.OK) {
            for (const purchase of results) {
              if (!purchase.acknowledged) {
                await updateDoc(doc(db, 'users', userId), {
                  subscriptionActive: true,
                  subscriptionType: 'apple',
                  subscriptionStarted: serverTimestamp(),
                });

                await InAppPurchases.finishTransactionAsync(purchase, false);

                Alert.alert(
                  'Subscription Active',
                  'Your barber subscription is now active.'
                );

                router.replace('/(app)/(barber)/dashboard');
              }
            }
          }
        });
      } catch (error) {
        console.log('IAP Error', error);
      }
    }

    initIAP();

    return () => {
      InAppPurchases.disconnectAsync();
    };
  }, []);

  const handleSubscribe = async () => {
    try {
      if (!productReady) {
        Alert.alert('Subscription unavailable', 'Subscription is not ready yet.');
        return;
      }

      setLoading(true);
      await InAppPurchases.purchaseItemAsync(PRODUCT_ID);
    } catch (error) {
      Alert.alert('Purchase Failed', error.message || 'Unable to complete purchase.');
    } finally {
      setLoading(false);
    }
  };

  const restorePurchases = async () => {
    try {
      const history = await InAppPurchases.getPurchaseHistoryAsync();

      if (history.responseCode === InAppPurchases.IAPResponseCode.OK) {
        const purchase = history.results.find(p => p.productId === PRODUCT_ID);

        if (purchase) {
          await updateDoc(doc(db, 'users', userId), {
            subscriptionActive: true,
            subscriptionType: 'apple',
            subscriptionStarted: serverTimestamp(),
          });

          Alert.alert('Subscription Restored', 'Your subscription has been restored.');
          router.replace('/(app)/(barber)/dashboard');
        } else {
          Alert.alert('No Purchases Found', 'No previous subscription was found.');
        }
      }
    } catch (error) {
      Alert.alert('Restore Failed', 'Unable to restore purchases.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Barber Subscription</Text>
      <Text style={styles.price}>$50 / month</Text>

      <Text style={styles.description}>
        Unlock the full ScheduleSync barber platform and manage your shop.
      </Text>

      <View style={styles.features}>
        <Text style={styles.feature}>- Appointment scheduling</Text>
        <Text style={styles.feature}>- AI receptionist</Text>
        <Text style={styles.feature}>- No-show protection</Text>
        <Text style={styles.feature}>- Customer notifications</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubscribe} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Subscribe</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.restoreButton} onPress={restorePurchases}>
        <Text style={styles.restoreText}>Restore Purchase</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  price: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
    color: '#007bff',
  },
  description: {
    textAlign: 'center',
    marginBottom: 30,
  },
  features: {
    marginBottom: 30,
  },
  feature: {
    fontSize: 16,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  restoreButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
});