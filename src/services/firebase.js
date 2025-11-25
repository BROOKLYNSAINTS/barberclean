// firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeAuth, 
  getAuth, 
  getReactNativePersistence , 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged 
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
  limit
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const extra = Constants.expoConfig?.extra;

// ✅ Firebase config
export const firebaseConfig = {
  apiKey: extra?.firebase?.apiKey,
  authDomain: extra?.firebase?.authDomain,
  projectId: extra?.firebase?.projectId,
  storageBucket: extra?.firebase?.storageBucket,
  messagingSenderId: extra?.firebase?.messagingSenderId,
  appId: extra?.firebase?.appId,
  measurementId: extra?.firebase?.measurementId,
};
console.log(firebaseConfig);
// ✅ Initialize Firebase only once
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
let auth;
// ✅ Services
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // If already initialized, get the existing instance
  auth = getAuth(app);
}
const db = getFirestore(app);
const functions = getFunctions(app);

// ✅ Auth helpers
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const registerUser = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const getUserProfile = async (userId) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
};

export const createUserProfile = async (userId, profileData) => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, profileData, { merge: true });
};

// Update a user's profile
export const updateUserProfile = async (userId, updatedData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, updatedData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const getBarbersByZipcode = async (zipcode) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'barber'), where('zipcode', '==', zipcode));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getBarberServices = async (barberId) => {
  const servicesRef = collection(db, 'users', barberId, 'services');
  const snapshot = await getDocs(servicesRef);

  const services = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  console.log("📦 Full Service Data:", services);
  return services;
};


export const getBarberAvailability = async (barberId) => {
  const userRef = doc(db, 'users', barberId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    console.log(`❌ No user found with ID ${barberId}`);
    return [];
  }

  const userData = userSnap.data();
  const { workingDays, workingHours } = userData;
  console.log('🗓️ Barber workingDays:', workingDays, 'workingHours:', workingHours);

  const today = new Date();
  const availability = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    if (workingDays?.[dayName]) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const start = parseTime(workingHours.start);
      const end = parseTime(workingHours.end);
      const interval = workingHours.interval || 30;

      for (let time = start; time < end; time += interval) {
        availability.push({
          date: dateStr,
          time: formatTime(time)
        });
      }
    }
  }

  console.log('📅 Computed Availability:', availability);
  return availability;
};

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const dt = new Date();
  dt.setHours(hours, minutes);
  return dt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
}

export async function createAppointment(data) {
  try {
    console.log("📝 Attempting to write appointment to Firestore:", data);
    const docRef = await addDoc(collection(db, 'appointments'), data);
    console.log("✅ Firestore appointment created with ID:", docRef.id);
    return docRef.id;
  } catch (err) {
    console.error("❌ Failed to create appointment in Firestore:", err);
    throw err;
  }
}
export const getAppointmentsByBarber = async (barberId) => {
return {
  ...docRef,  // if you're returning the ref manually
  id: docRef.id,
  ...data  // Make sure this includes date and time
};
};

export const getCustomerAppointments = async (customerId) => {
  try {
    const q = query(
      collection(db, 'appointments'),
      where('customerId', '==', customerId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching customer appointments:', error);
    return [];
  }
};
// Get a single appointment by its ID
export const getBarberAppointments = async (appointmentId) => {
  try {
    const apptRef = doc(db, 'appointments', appointmentId);
    const apptSnap = await getDoc(apptRef);
    if (!apptSnap.exists()) return null;
    return { id: apptSnap.id, ...apptSnap.data() };
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return null;
  }
};

export const getBarberReviews = async (barberId) => {
  const reviewsRef = collection(db, 'users', barberId, 'reviews');
  const snapshot = await getDocs(reviewsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const getBarberRating = async (barberId) => {
  const reviews = await getBarberReviews(barberId);
  if (reviews.length === 0) return 0;

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  return totalRating / reviews.length;
};
export const getBarberNotifications = async (barberId) => {
  const notificationsRef = collection(db, 'users', barberId, 'notifications');
  const snapshot = await getDocs(notificationsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const markNotificationAsRead = async (barberId, notificationId) => {
  const notifRef = doc(db, 'users', barberId, 'notifications', notificationId);
  await updateDoc(notifRef, { read: true });
};

// Get all bulletins posts
export const getBulletinPosts = async () => {
  try {
    const postsRef = collection(db, 'bulletins');
    const snapshot = await getDocs(postsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching bulletin posts:', error);
    return [];
  }
};

// Add a new service for a barber
export const addBarberService = async (barberId, serviceData) => {
  try {
    const servicesRef = collection(db, 'users', barberId, 'services');
    const docRef = await addDoc(servicesRef, serviceData);
    return { id: docRef.id, ...serviceData };
  } catch (error) {
    console.error('Error adding barber service:', error);
    throw error;
  }
};

// Create a new bulletin post
export const createBulletinPost = async (postData) => {
  try {
    const postsRef = collection(db, 'bulletins'); // ✅ fixed collection name
    const docRef = await addDoc(postsRef, postData);
    return { id: docRef.id, ...postData };
  } catch (error) {
    console.error('Error creating bulletin post:', error);
    throw error;
  }
};

// Get a single bulletin post by its ID
export const getBulletinPostDetails = async (postId) => {
  try {
    const postRef = doc(db, 'bulletins', postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return null;
    return { id: postSnap.id, ...postSnap.data() };
  } catch (error) {
    console.error('Error fetching bulletin post details:', error);
    return null;
  }
};

// Add a comment to a bulletin post
export const addCommentToBulletinPost = async (postId, commentData) => {
  try {
    const commentsRef = collection(db, 'bulletins', postId, 'comments');
    const docRef = await addDoc(commentsRef, commentData);
    return { id: docRef.id, ...commentData };
  } catch (error) {
    console.error('Error adding comment to bulletin post:', error);
    throw error;
  }
};

export const addCommentToPost = async (postId, commentText) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const comment = {
    text: commentText,
    authorId: user.uid,
    authorName: user.displayName || 'Anonymous',
    createdAt: new Date().toISOString(),
  };

  const commentsRef = collection(db, 'bulletins', postId, 'comments');
  const docRef = await addDoc(commentsRef, comment);
  return { id: docRef.id, ...comment };
};

// Cancel appointment by updating status or deleting
export const cancelAppointment = async (appointmentId, userId) => {
  try {
    console.log('Cancelling appointment:', appointmentId);
    const appointmentRef = doc(db, 'appointments', appointmentId);
    
    // Option 1: Update status to cancelled (preserves data)
    await updateDoc(appointmentRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy: userId
    });
    
    console.log('✅ Appointment cancelled successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error cancelling appointment:', error);
    throw error;
  }
};

// Delete appointment completely (if you prefer to remove it entirely)
export const deleteAppointment = async (appointmentId) => {
  try {
    console.log('Deleting appointment:', appointmentId);
    const appointmentRef = doc(db, 'appointments', appointmentId);
    await deleteDoc(appointmentRef);
    
    console.log('✅ Appointment deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting appointment:', error);
    throw error;
  }
};
export const scheduleAppointmentReminder = async (appointment) => {
  try {
    const { date, time, customerId } = appointment;
    const reminderTime = new Date(`${date}T${time}:00`);
    reminderTime.setHours(reminderTime.getHours() - 1); // 1 hour before

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Appointment Reminder',
        body: `You have an appointment scheduled for ${date} at ${time}.`,
        data: { appointmentId: appointment.id }
      },
      trigger: reminderTime
    });

    console.log('✅ Appointment reminder scheduled:', reminderTime);
  } catch (error) {
    console.error('❌ Error scheduling appointment reminder:', error);
  }
};
export const getLastAppointmentForUser = async (customerId) => {
  try {
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('🔥 Error fetching last appointment:', error);
    throw error;
  }
};

export const getAppointmentByDateTime = async (userId, date, time) => {
  try {
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('customerId', '==', userId),
      where('date', '==', date),
      where('time', '==', time)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    // Assuming there's only one matching appointment
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('❌ Error fetching appointment by date/time:', error);
    return null;
  }
};

// Get all appointments for a user on a date
export const getAppointmentsForUserDate = async (userId, date) => {
  const q = query(
    collection(db, 'appointments'),
    where('customerId', '==', userId),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// (Optional) list all user appointments for debugging
export const listAllUserAppointments = async (userId) => {
  const q = query(collection(db, 'appointments'), where('customerId','==',userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Add this helper (ensure imports at top include: collection, query, where, orderBy, limit, getDocs)
export async function getRecentAppointmentsForUser(userId, count = 3) {
  if (!userId) return [];
  const qRef = query(
    collection(db, 'appointments'),
    where('customerId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const snap = await getDocs(qRef);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
    };
  });
}

export async function updateBarberService(barberId, serviceId, data) {
  const serviceRef = doc(db, 'users', barberId, 'services', serviceId);
  await updateDoc(serviceRef, data);
}

export {
  app,
  auth,
  db,
  functions,
  onAuthStateChanged
  };
