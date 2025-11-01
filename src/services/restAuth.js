import axios from 'axios';
import Constants from 'expo-constants';
const EXTRA = Constants.expoConfig?.extra ?? {};
const FIREBASE_API_KEY = EXTRA.FIREBASE_API_KEY;
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Alert } from 'react-native';
import { auth } from './firebase';
const FIREBASE_AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts`;

console.log('🔑 Firebase API Key:', FIREBASE_API_KEY);

export const loginWithEmail = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

/*export const loginWithEmail = async (email, password) => {
  console.log("📤 Starting loginWithEmail (using fetch)...");
  console.log("📤 EMAIL:", email);
  console.log("📤 PASSWORD:", password);

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
  const body = JSON.stringify({
    email,
    password,
    returnSecureToken: true,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Firebase error (fetch):", data);
      throw new Error(data.error?.message || 'Login failed');
    }

    console.log("✅ Login success (fetch):", data);
    return data;
  } catch (error) {
    console.error("🚫 Network or fetch error:", error.message);
    throw error;
  }
};*/

/*export const loginWithEmail = async (email, password) => {
  console.log("📤 Starting loginWithEmail...");
  console.log("email:", email);
  console.log("password:", password);

  await axios.get('https://jsonplaceholder.typicode.com/posts')
  // 🧪 Validate inputs early
  if (!email || !password) {
    console.log("🚫 Missing email or password");
    throw new Error("Email and password required.");
  }

  try {
    console.log("📤 Sending credentials to Firebase...");
    console.log("📤 Firebase AUTH URL", FIREBASE_AUTH_URL);
    console.log("📤 Firebase API KEY", FIREBASE_API_KEY);
    console.log("📤 EMAIL", email);
    console.log("📤 PASSWORD", password);
    const response = await axios.post(
      `${FIREBASE_AUTH_URL}:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      },
      { timeout: 7000 } // ✅ Properly placed
    );

    console.log('✅ Login success:', response.data);
    return response.data;

  } catch (error) {
    const msg = error?.response?.data?.error?.message || error.message;
    console.error('❌ REST login error:', msg);
    throw new Error(msg);
  }
};*/
