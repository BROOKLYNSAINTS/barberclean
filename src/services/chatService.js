import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase'; // adjust if your db is exported from another path
import { useAuth } from '@/contexts/AuthContext'; // adjust if your AuthContext is exported from another path
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useEffect } from 'react';


export const startOrGetChatThread = async (barber1Id, barber2Id) => {
  if (!barber1Id || !barber2Id || barber1Id === barber2Id) return null;

  const participants = [barber1Id, barber2Id].sort(); // ensures consistent order

  try {
    // 1. Check if a thread already exists
    const chatQuery = query(
      collection(db, 'chats'),
      where('participants', '==', participants)
    );

    const snapshot = await getDocs(chatQuery);

    if (!snapshot.empty) {
      const existingThread = snapshot.docs[0];
      return existingThread.id; // ✅ Return just the ID
    }

    // 2. Create a new thread if it doesn't exist
    const newChat = {
      participants,
      createdAt: serverTimestamp(),
      lastMessage: null,
    };

    const docRef = await addDoc(collection(db, 'chatThreads'), newChat);
    return docRef.id; // ✅ Return just the ID
  } catch (error) {
    console.error('Error starting or fetching chat thread:', error);
    throw error;
  }
};
