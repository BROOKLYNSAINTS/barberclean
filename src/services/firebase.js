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

const VERCEL_BYPASS = process.env.EXPO_PUBLIC_VERCEL_BYPASS_SECRET;

function getBackendUrl() {
  return extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;
}

async function getAuthHeaders() {
  const base = { 'Content-Type': 'application/json' };
  try {
    const user = auth.currentUser;
    if (!user) return base;
    const token = await user.getIdToken();
    return { ...base, Authorization: `Bearer ${token}` };
  } catch {
    return base;
  }
}

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

export const createUserProfile = (userId, data) =>
  setDoc(doc(db, 'users', userId), data, { merge: true });

export const updateUserProfile = (userId, data) =>
  updateDoc(doc(db, 'users', userId), data);

export const getBarbersByZipcode = async (zipcode) => {
  if (!zipcode) return [];
  const qRef = query(
    collection(db, 'users'),
    where('role', '==', 'barber'),
    where('zipcode', '==', String(zipcode))
  );
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getBarberServices = async (barberId) => {
  if (!barberId) return [];
  const snap = await getDocs(collection(db, 'users', barberId, 'services'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getBarberReviews = async (barberId) => {
  if (!barberId) return [];
  const snap = await getDocs(collection(db, 'users', barberId, 'reviews'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getAppointmentReview = async (barberId, appointmentId) => {
  if (!barberId || !appointmentId) return null;

  const currentUserId = auth.currentUser?.uid || null;
  const primaryRef = doc(db, 'users', barberId, 'reviews', appointmentId);
  const primarySnap = await getDoc(primaryRef);

  if (primarySnap.exists()) {
    const data = primarySnap.data() || {};
    const authorId = data.authorId || data.customerId || null;
    if (!currentUserId || !authorId || authorId === currentUserId) {
      return { id: primarySnap.id, ...data };
    }
  }

  if (currentUserId) {
    const customerScopedId = `${appointmentId}_${currentUserId}`;
    const customerScopedRef = doc(db, 'users', barberId, 'reviews', customerScopedId);
    const customerScopedSnap = await getDoc(customerScopedRef);
    if (customerScopedSnap.exists()) {
      return { id: customerScopedSnap.id, ...customerScopedSnap.data() };
    }
  }

  return null;
};

export const upsertBarberReview = async ({
  barberId,
  customerId,
  appointmentId,
  rating,
  text,
  customerName,
  serviceName,
}) => {
  if (!barberId) throw new Error('Missing barber ID');
  if (!customerId) throw new Error('Missing customer ID');
  if (!appointmentId) throw new Error('Missing appointment ID');

  const parsedRating = Number(rating);
  if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const normalizedText = String(text || '').trim();
  if (!normalizedText) {
    throw new Error('Review text is required');
  }

  const reviewRef = doc(db, 'users', barberId, 'reviews', appointmentId);
  const customerScopedRef = doc(
    db,
    'users',
    barberId,
    'reviews',
    `${appointmentId}_${customerId}`
  );
  const existingSnap = await getDoc(reviewRef);
  const nowTs = serverTimestamp();

  const payload = {
    barberId,
    authorId: customerId,
    customerId,
    appointmentId,
    customerName: customerName || 'Anonymous',
    serviceName: serviceName || null,
    rating: parsedRating,
    text: normalizedText,
    updatedAt: nowTs,
  };

  if (existingSnap.exists()) {
    try {
      await updateDoc(reviewRef, payload);
    } catch (error) {
      const code = String(error?.code || '');
      const msg = String(error?.message || '');
      const isPermissionDenied =
        code.includes('permission-denied') ||
        msg.toLowerCase().includes('permission');

      if (!isPermissionDenied) throw error;

      const customerScopedSnap = await getDoc(customerScopedRef);
      if (customerScopedSnap.exists()) {
        await updateDoc(customerScopedRef, payload);
      } else {
        await setDoc(customerScopedRef, {
          ...payload,
          createdAt: nowTs,
        });
      }
    }
  } else {
    await setDoc(reviewRef, {
      ...payload,
      createdAt: nowTs,
    });
  }

  const allReviewsSnap = await getDocs(collection(db, 'users', barberId, 'reviews'));
  let total = 0;
  let count = 0;

  allReviewsSnap.docs.forEach((d) => {
    const val = Number(d.data()?.rating);
    if (Number.isFinite(val) && val > 0) {
      total += val;
      count += 1;
    }
  });

  const avgRating = count > 0 ? Number((total / count).toFixed(1)) : 0;

  try {
    await setDoc(
      doc(db, 'users', barberId),
      {
        rating: avgRating,
        reviewCount: count,
        updatedAt: nowTs,
      },
      { merge: true }
    );
  } catch (error) {
    // Customers usually cannot update barber user profiles under current rules.
    console.warn('Review saved but barber aggregate update failed:', error);
  }

  try {
    await updateDoc(doc(db, 'appointments', appointmentId), {
      reviewRating: parsedRating,
      reviewedAt: nowTs,
      reviewUpdatedAt: nowTs,
      updatedAt: nowTs,
    });
  } catch (error) {
    console.warn('Review saved but appointment metadata update failed:', error);
  }

  return { id: reviewRef.id, ...payload };
};

export const getBarberAvailability = async (barberId, selectedDate = null) => {
  if (!barberId) return [];

  const barberSnap = await getDoc(doc(db, 'users', barberId));
  if (!barberSnap.exists()) return [];

  const barberData = barberSnap.data() || {};
  const unavailableDates =
    barberData.unavailableDates && typeof barberData.unavailableDates === 'object'
      ? barberData.unavailableDates
      : {};
  const workingHours = barberData.workingHours || {};

  const startStr = workingHours.start || '08:00';
  const endStr = workingHours.end || '17:00';
  const interval = Number(workingHours.interval || 30);

  const startMin = parseHHMMToMinutes(startStr);
  const endMin = parseHHMMToMinutes(endStr);
  if (
    startMin == null ||
    endMin == null ||
    !Number.isFinite(interval) ||
    interval <= 0 ||
    startMin >= endMin
  ) {
    return [];
  }

  const bookedByDate = new Map();
  try {
    const appointmentsSnap = await getDocs(
      query(
        collection(db, 'appointments'),
        where('barberId', '==', barberId),
        where('status', '==', 'confirmed')
      )
    );
    for (const d of appointmentsSnap.docs) {
      const a = d.data() || {};
      if (!a.date) continue;
      const t24 = a.time24 || toTime24(a.time);
      if (!t24) continue;
      if (!bookedByDate.has(a.date)) bookedByDate.set(a.date, new Set());
      bookedByDate.get(a.date).add(t24);
    }
  } catch (error) {
    console.warn('Failed to load booked slots for barber availability:', error);
  }

  const now = new Date();
  const todayStr = toLocalDateString(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const buildSlotsForDate = (dateStr) => {
    if (unavailableDates[dateStr]) return [];

    const bookedSet = bookedByDate.get(dateStr) || new Set();
    const isToday = dateStr === todayStr;
    const slots = [];

    for (let minute = startMin; minute + interval <= endMin; minute += interval) {
      if (isToday && minute <= nowMinutes) continue;

      const hh = String(Math.floor(minute / 60)).padStart(2, '0');
      const mm = String(minute % 60).padStart(2, '0');
      const t24 = `${hh}:${mm}`;

      if (bookedSet.has(t24)) continue;
      slots.push({
        date: dateStr,
        time: formatMinutesTo12h(minute),
      });
    }

    return slots;
  };

  if (selectedDate) {
    return buildSlotsForDate(selectedDate).map((slot) => slot.time);
  }

  const allSlots = [];
  for (let i = 0; i < 90; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = toLocalDateString(d);
    allSlots.push(...buildSlotsForDate(dateStr));
  }
  return allSlots;
};

/* =========================================================
   TIME HELPERS (robust parsing)
========================================================= */

// Converts "3:00 PM" or "3:00 PM" or "18:00" to "HH:MM"
function toTime24(rawTime) {
  if (!rawTime) return null;

  const str = String(rawTime)
    .replace(/\u202f|\u00a0/g, ' ') // narrow NBSP + NBSP
    .replace(/\s+/g, ' ')
    .trim();

  // Already 24h?
  const m24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = Number(m24[1]);
    const mm = Number(m24[2]);
    if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  // 12h format
  const m12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m12) return null;

  let h = Number(m12[1]);
  const mins = Number(m12[2]);
  const mer = m12[3].toUpperCase();

  if (h < 1 || h > 12 || mins < 0 || mins > 59) return null;
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;

  return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Build a JS Date from "YYYY-MM-DD" + time ("HH:MM")
function buildLocalDateTime(dateStr, time24) {
  // Device is NY during your tests; this is fine for now.
  return new Date(`${dateStr}T${time24}:00`);
}

function parseHHMMToMinutes(hhmm) {
  const [hRaw, mRaw] = String(hhmm || '')
    .split(':')
    .map((v) => Number(v));
  if (!Number.isFinite(hRaw) || !Number.isFinite(mRaw)) return null;
  if (hRaw < 0 || hRaw > 23 || mRaw < 0 || mRaw > 59) return null;
  return hRaw * 60 + mRaw;
}

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMinutesTo12h(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const dt = new Date();
  dt.setHours(hours, minutes, 0, 0);
  return dt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/* =========================================================
   NO SHOW SETTINGS HELPERS
========================================================= */

function normalizeNoShowSettings(raw) {
  const ns = raw && typeof raw === 'object' ? raw : {};
  const enabled = !!ns.enabled;
  const feeType = ns.feeType === 'percent' ? 'percent' : 'flat';
  const feeAmount = Number(ns.feeAmount ?? 25);
  const windowHours = Number(ns.cancellationWindowHours ?? 24);

  return {
    enabled,
    feeType,
    feeAmount: Number.isFinite(feeAmount) ? feeAmount : 25,
    cancellationWindowHours: Number.isFinite(windowHours) ? windowHours : 24,
  };
}

// Compute cents
function computeNoShowAmountCents(servicePriceDollars, settings) {
  const price = Number(servicePriceDollars || 0);
  if (!Number.isFinite(price) || price <= 0) return 0;

  if (settings.feeType === 'percent') {
    const pct = Math.min(Math.max(Number(settings.feeAmount || 0), 0), 100);
    const cents = Math.round(price * 100 * (pct / 100));
    return Math.max(0, cents);
  }

  // flat dollars
  const flat = Math.min(Math.max(Number(settings.feeAmount || 0), 0), 500);
  return Math.round(flat * 100);
}

/* =========================================================
   APPOINTMENT CREATION
========================================================= */

export async function createAppointment(data) {
  try {
    if (!data?.barberId || !data?.date || !data?.time || !data?.customerId) {
      throw new Error('Missing required appointment fields.');
    }

    // Customer
    const customerSnap = await getDoc(doc(db, 'users', data.customerId));
    if (!customerSnap.exists()) throw new Error('Customer not found');
    const customer = customerSnap.data() || {};

    if (!customer.stripeCustomerId || !customer.defaultPaymentMethodId) {
      throw new Error('Customer has no saved payment method');
    }

    // Barber
    const barberSnap = await getDoc(doc(db, 'users', data.barberId));
    if (!barberSnap.exists()) throw new Error('Barber not found');
    const barber = barberSnap.data() || {};

    const barberStripeAccountId =
      barber.stripeConnectAccountId || barber.stripeAccountId || barber.stripeAccountId;

    if (!barberStripeAccountId) {
      throw new Error('Barber is not connected to Stripe');
    }

    // Barber no-show settings (THIS is the missing link in your current setup)
    const barberNoShow = normalizeNoShowSettings(barber.noShowSettings);
    const amountCents = barberNoShow.enabled
      ? computeNoShowAmountCents(data.servicePrice, barberNoShow)
      : 0;

    const appointmentRef = doc(collection(db, 'appointments'));
    const now = Timestamp.now();

    const appointmentData = {
      ...data,

      // Stripe linkage needed for charging later
      customerStripeId: customer.stripeCustomerId,
      customerStripePaymentMethodId: customer.defaultPaymentMethodId,
      barberStripeAccountId,

      // Normalize time for cancel logic (keep original display too)
      time: data.time, // keep UI value (ex "3:00 PM")
      time24: toTime24(data.time) || null, // NEW canonical

      paymentStatus: 'unpaid',
      status: 'confirmed',

      // Store the EXACT no-show config used for this appointment
      noShowProtection: {
        enabled: barberNoShow.enabled,
        feeType: barberNoShow.feeType, // flat | percent
        feeAmount: barberNoShow.feeAmount,
        cancellationWindowHours: barberNoShow.cancellationWindowHours,
        amountCents, // IMPORTANT (ex 2500)
        status: 'none', // none | pending_charge | charged
        paymentIntentId: null,
      },

      createdAt: now,
      updatedAt: now,
    };

    await setDoc(appointmentRef, appointmentData);
    return { id: appointmentRef.id, ...appointmentData };
  } catch (err) {
    console.error('❌ Failed to create appointment:', err);
    throw err;
  }
}

/* =========================================================
   CANCEL APPOINTMENT + LATE FEE LOGIC (WORKING)
========================================================= */

export const cancelAppointment = async (appointmentId, userId) => {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const snap = await getDoc(appointmentRef);

    if (!snap.exists()) throw new Error('Appointment not found');

    const appt = snap.data() || {};

    // If already cancelled, just return success (idempotent)
    if (appt.status === 'cancelled') {
      return { success: true, alreadyCancelled: true };
    }

    const ns = appt.noShowProtection || {};
    const enabled = !!ns.enabled;
    const windowHours = Number(ns.cancellationWindowHours ?? 24);
    const amountCents = Number(ns.amountCents ?? 0);

    // Compute how close to appointment
    const t24 = appt.time24 || toTime24(appt.time);
    if (!t24) {
      // Cancel anyway if time parsing fails
      await updateDoc(appointmentRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: userId,
        updatedAt: serverTimestamp(),
      });
      return { success: true, warning: 'Time parsing failed; cancelled without fee check.' };
    }

    const apptDt = buildLocalDateTime(appt.date, t24);
    const now = new Date();
    const diffMs = apptDt.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    let nextNoShowStatus = ns.status || 'none';
    let paymentStatus = appt.paymentStatus || 'unpaid';
    let paymentIntentId = ns.paymentIntentId || null;

    // Only charge if within window AND enabled AND amount > 0
    const shouldCharge =
      enabled &&
      Number.isFinite(windowHours) &&
      diffHours <= windowHours &&
      diffHours >= 0 && // future appt only
      amountCents > 0;

    if (shouldCharge) {
      try {
        const BACKEND_URL = getBackendUrl();
        if (!BACKEND_URL) throw new Error('Backend URL not configured');

        const headers = await getAuthHeaders();
        const url = `${BACKEND_URL}/api/charge-no-show${
          VERCEL_BYPASS ? `?x-vercel-protection-bypass=${VERCEL_BYPASS}` : ''
        }`;

        const resp = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ appointmentId }),
        });

        const text = await resp.text();
        let payload = {};
        try {
          payload = text ? JSON.parse(text) : {};
        } catch {
          payload = { raw: text };
        }

        if (!resp.ok || !payload.success) {
          throw new Error(payload?.error || payload?.details || payload?.raw || 'Charge failed');
        }

        nextNoShowStatus = 'charged';
        paymentStatus = 'late_fee_paid';
        paymentIntentId = payload.paymentIntentId || paymentIntentId;
      } catch (chargeError) {
        console.log('❌ Late fee charge failed:', chargeError?.message || chargeError);
        nextNoShowStatus = 'pending_charge';
        paymentStatus = 'late_fee_failed';
      }
    }

    await updateDoc(appointmentRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy: userId,

      paymentStatus,

      noShowProtection: {
        ...ns,
        status: nextNoShowStatus,
        paymentIntentId: paymentIntentId || null,
      },

      updatedAt: serverTimestamp(),
    });

    return { success: true, charged: nextNoShowStatus === 'charged' };
  } catch (error) {
    console.error('❌ Error cancelling appointment:', error);
    throw error;
  }
};

/* =========================================================
   FETCH HELPERS
========================================================= */

export const getAppointmentsByBarber = async (barberId) => {
  const qRef = query(
    collection(db, 'appointments'),
    where('barberId', '==', barberId)
  );
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getCustomerAppointments = async (customerId) => {
  const qRef = query(
    collection(db, 'appointments'),
    where('customerId', '==', customerId)
  );
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getBarberAppointments = getAppointmentsByBarber;

export const getLastAppointmentForUser = async (customerId) => {
  if (!customerId) return null;
  const qRef = query(
    collection(db, 'appointments'),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snap = await getDocs(qRef);
  if (snap.empty) return null;
  const first = snap.docs[0];
  return { id: first.id, ...first.data() };
};

export const getRecentAppointmentsForUser = async (customerId, count = 3) => {
  if (!customerId) return [];
  const qRef = query(
    collection(db, 'appointments'),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

function toIsoStringIfPossible(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return null;
}

export const getBulletinPosts = async () => {
  const qRef = query(collection(db, 'bulletins'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(qRef);

  return snap.docs.map((d) => {
    const data = d.data() || {};
    return {
      id: d.id,
      ...data,
      createdAt: toIsoStringIfPossible(data.createdAt),
      updatedAt: toIsoStringIfPossible(data.updatedAt),
    };
  });
};

export const createBulletinPost = async (postData) => {
  const createdAt = postData?.createdAt || new Date().toISOString();
  const ref = await addDoc(collection(db, 'bulletins'), {
    ...postData,
    createdAt,
    updatedAt: new Date().toISOString(),
  });
  return { id: ref.id, ...postData, createdAt };
};

export const addCommentToPost = async (postId, commentData) => {
  if (!postId) throw new Error('postId is required');
  const createdAt = commentData?.createdAt || new Date().toISOString();
  const ref = await addDoc(collection(db, 'bulletins', postId, 'comments'), {
    ...commentData,
    createdAt,
  });
  return { id: ref.id, ...commentData, createdAt };
};

export const addBarberService = async (barberId, serviceData) => {
  const ref = await addDoc(collection(db, 'users', barberId, 'services'), {
    ...serviceData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id, ...serviceData };
};

export const updateBarberService = async (barberId, serviceId, data) => {
  await updateDoc(doc(db, 'users', barberId, 'services', serviceId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  return { id: serviceId, ...data };
};

export { app, auth, db, functions, onAuthStateChanged, doc, getDoc, deleteDoc };
