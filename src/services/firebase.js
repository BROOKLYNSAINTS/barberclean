// src/services/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  runTransaction,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const extra = Constants.expoConfig?.extra;
const envFirebase = extra?.firebase || {};

export const firebaseConfig = {
  apiKey: envFirebase.apiKey,
  authDomain: envFirebase.authDomain,
  projectId: envFirebase.projectId,
  storageBucket: envFirebase.storageBucket,
  messagingSenderId: envFirebase.messagingSenderId,
  appId: envFirebase.appId,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);
const functions = getFunctions(app);

/* =========================================================
   AUTH
========================================================= */

export const loginUser = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerUser = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

export const logoutUser = () => signOut(auth);

export const getUserProfile = async (userId) => {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? snap.data() : null;
};

export const createUserProfile = async (userId, data) => {
  try {
    await setDoc(
      doc(db, "users", userId),
      {
        ...data,

        // ✅ ADD DEFAULTS
        metrics: {
          recoveredRevenue: 0,
        },

        notificationToken: "",
        notificationsEnabled: true,

        // keep consistent structure
        subscription: data.subscription || {
          status: "inactive",
        },

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};
export const updateUserProfile = async (userId, data) => {
  try {
    await updateDoc(doc(db, "users", userId), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};
export const getBarberReviews = async (barberId) => {
  try {
    const reviewsRef = collection(db, "users", barberId, "reviews");
    const snapshot = await getDocs(reviewsRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching barber reviews:", error);
    return [];
  }
};
export const getBarberAvailability = async (barberId) => {
  try {
    const userRef = doc(db, 'users', barberId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return [];

    const userData = userSnap.data();

    const workingHours = userData.workingHours || {
      start: '09:00',
      end: '17:00',
      interval: 30
    };

    const unavailableDates = userData.unavailableDates || {};

    const availability = [];

    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const currentDate = new Date();
      currentDate.setDate(today.getDate() + i);

      const dateStr = currentDate.toISOString().split('T')[0];

      if (unavailableDates[dateStr]) continue;

      const start = parseTime(workingHours.start);
      const end = parseTime(workingHours.end);
      const interval = workingHours.interval || 30;

      for (let t = start; t < end; t += interval) {
        availability.push({
          date: dateStr,
          time: formatTime(t),
        });
      }
    }

    return availability;

  } catch (error) {
    console.error('Error fetching availability:', error);
    return [];
  }
};
export const getBarberAppointments = async (barberId) => {
  try {
    const q = query(
      collection(db, "appointments"),
      where("barberId", "==", barberId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  } catch (error) {
    console.error("Error fetching barber appointments:", error);
    return [];
  }
};

export const getCustomerAppointments = async (customerId) => {
  try {
    const q = query(
      collection(db, "appointments"),
      where("customerId", "==", customerId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  } catch (error) {
    console.error("Error fetching customer appointments:", error);
    return [];
  }
};

export const getBarberServices = async (barberId) => {
  try {
    const servicesRef = collection(db, "users", barberId, "services");

    const snapshot = await getDocs(servicesRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  } catch (error) {
    console.error("Error fetching barber services:", error);
    return [];
  }
};

// ADD SERVICE
export const addBarberService = async (barberId, serviceData) => {
  try {
    const servicesRef = collection(db, "users", barberId, "services");

    const docRef = await addDoc(servicesRef, {
      ...serviceData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error adding service:", error);
    throw error;
  }
};

// UPDATE SERVICE
export const updateBarberService = async (barberId, serviceId, serviceData) => {
  try {
    const serviceRef = doc(db, "users", barberId, "services", serviceId);

    await updateDoc(serviceRef, {
      ...serviceData,
      updatedAt: serverTimestamp(),
    });

  } catch (error) {
    console.error("Error updating service:", error);
    throw error;
  }
};

// DELETE SERVICE
export const deleteBarberService = async (barberId, serviceId) => {
  try {
    const serviceRef = doc(db, "users", barberId, "services", serviceId);
    await deleteDoc(serviceRef);
  } catch (error) {
    console.error("Error deleting service:", error);
    throw error;
  }
};
// ================= NETWORK =================

export const getBarbersByZipcode = async (zipcode) => {
  try {
    if (!zipcode) return [];

    const q = query(
      collection(db, "users"),
      where("role", "==", "barber"),
      where("zipcode", "==", zipcode)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  } catch (error) {
    console.error("Error fetching barbers by zipcode:", error);
    return [];
  }
};
/* =========================================================
   CREATE APPOINTMENT (🔥 FIXED — NO STRIPE REQUIRED)
========================================================= */

export async function createAppointment(data) {
  try {
    if (!data?.barberId || !data?.date || !data?.time || !data?.customerId) {
      throw new Error('Missing required appointment fields.');
    }

    const appointmentRef = doc(collection(db, 'appointments'));

    return await runTransaction(db, async (transaction) => {

      // 🔥 CUSTOMER
      const customerRef = doc(db, 'users', data.customerId);
      const customerSnap = await transaction.get(customerRef);
      if (!customerSnap.exists()) throw new Error('Customer not found');
      const customer = customerSnap.data() || {};

      // ❌ REMOVED STRIPE REQUIREMENT COMPLETELY

      // 🔥 BARBER
      const barberRef = doc(db, 'users', data.barberId);
      const barberSnap = await transaction.get(barberRef);
      if (!barberSnap.exists()) throw new Error('Barber not found');
      const barber = barberSnap.data() || {};

      const barberTwilioNumber =
        barber.twilioNumber || barber.twilioPhoneNumber || null;

      if (!barberTwilioNumber) {
        throw new Error('Barber missing Twilio number');
      }

      const customerPhone = data.customerPhone || customer.phone || null;

      if (!customerPhone) {
        throw new Error('Customer missing phone');
      }

      const now = Timestamp.now();

      const appointmentData = {
        ...data,

        barberTwilioNumber,
        customerPhone,

        // ❌ NO STRIPE DATA

        paymentStatus: 'unpaid',
        status: 'confirmed',

        createdAt: now,
        updatedAt: now,
      };

      transaction.set(appointmentRef, appointmentData);

      return { id: appointmentRef.id, ...appointmentData };
    });

  } catch (err) {
    console.error('❌ Failed to create appointment:', err);
    throw err;
  }
}

/* =========================================================
   EXPORTS
========================================================= */

export {
  app,
  auth,
  db,
  functions,
  onAuthStateChanged
};