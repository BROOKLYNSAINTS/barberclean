import { createUserWithEmailAndPassword, signInWithEmailAndPassword, getAuth, sendPasswordResetEmail} from 'firebase/auth';
import { auth } from './firebase';
import { app } from './firebase'; // adjust path if needed
// Register new user
export const registerUser = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// Login user
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const resetPassword = async (email) => {
  if (!email) throw new Error('Email is required');
  
  const auth = getAuth(app);
  try {
    await sendPasswordResetEmail(auth, email);
    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw error;
  }
};
