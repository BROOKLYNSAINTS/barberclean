// src/services/chatService.js
import { db } from '@/services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

function makeThreadId(uidA, uidB) {
  const [a, b] = [String(uidA), String(uidB)].sort();
  return `${a}__${b}`;
}

export const startOrGetChatThread = async (uidA, uidB) => {
  if (!uidA || !uidB || uidA === uidB) {
    throw new Error('Invalid user ids');
  }

  const threadId = makeThreadId(uidA, uidB);
  const ref = doc(db, 'chatThreads', threadId);

  const snap = await getDoc(ref);
  if (snap.exists()) return threadId;

  await setDoc(ref, {
    participants: [uidA, uidB].sort(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: null,
  });

  return threadId;
};

export const getThreadIdForUsers = (uidA, uidB) => {
  if (!uidA || !uidB || uidA === uidB) return '';
  return makeThreadId(uidA, uidB);
};
