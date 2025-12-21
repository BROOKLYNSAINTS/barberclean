import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

function makeThreadId(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
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
