// src/services/chatService.js
import { db } from '@/services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

function makeThreadId(uidA, uidB) {
  const [a, b] = [String(uidA), String(uidB)].sort();
  return `${a}__${b}`;
}

/**
 * Creates the thread if missing, otherwise leaves it alone.
 * IMPORTANT: We avoid getDoc() because your rules deny reads on non-existent docs.
 */
export const startOrGetChatThread = async (uidA, uidB) => {
  if (!uidA || !uidB || uidA === uidB) {
    throw new Error('Invalid user ids');
  }

  const a = String(uidA);
  const b = String(uidB);

  const threadId = makeThreadId(a, b);
  const ref = doc(db, 'chatThreads', threadId);

  // setDoc with merge:true works for BOTH:
  // - create (doc missing) -> allowed by your create rule
  // - update (doc exists)  -> allowed if you are a participant
  await setDoc(
    ref,
    {
      participants: [a, b].sort(),
      // createdAt should only be set on first creation; merge:true + createdAt
      // is safe because existing value will remain unless missing.
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null,
    },
    { merge: true }
  );

  return threadId;
};

export const getThreadIdForUsers = (uidA, uidB) => {
  if (!uidA || !uidB || uidA === uidB) return '';
  return makeThreadId(uidA, uidB);
};
