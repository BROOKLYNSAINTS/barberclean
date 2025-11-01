import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../src/services/firebase';
console.log('Auth imported from firebase:', auth);

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔥 onAuthStateChanged fired:', user?.email || 'null');
          console.log('🔥 onAuthStateChanged fired:', user?.email || 'null');

      setCurrentUser(user);
      setLoading(false);
    });

    // ⏱ Fallback: manually assign currentUser in case listener is delayed
    const timeout = setTimeout(() => {
      if (!auth.currentUser) return;
      console.log('⏱ Fallback: manually setting currentUser from auth.currentUser');
      setCurrentUser(auth.currentUser);
      setLoading(false);
    }, 1000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
