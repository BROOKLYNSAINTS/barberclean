import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';


export const startOrGetChatThread = async (barber1Id, barber2Id) => {
  if (!barber1Id || !barber2Id || barber1Id === barber2Id) return null;

  const participants = [barber1Id, barber2Id].sort();

  try {
    // Use the same collection name for query and creation
    const chatQuery = query(
      collection(db, 'chatThreads'),
      where('participants', '==', participants)
    );

    const snapshot = await getDocs(chatQuery);

    if (!snapshot.empty) {
      const existingThread = snapshot.docs[0];
      return existingThread.id;
    }

    const [user1Snap, user2Snap] = await Promise.all([
      getDoc(doc(db, 'users', participants[0])),
      getDoc(doc(db, 'users', participants[1])),
    ]);

    const participantsInfo = [user1Snap, user2Snap].map((snap, index) => ({
      id: participants[index],
      name: snap.exists() ? snap.data().name || 'Barber' : 'Barber',
    }));

    const newChat = {
      participants,
      participantsInfo,
      createdAt: serverTimestamp(),
      lastMessage: null,
    };

    const docRef = await addDoc(collection(db, 'chatThreads'), newChat);
    return docRef.id;
  } catch (error) {
    console.error('Error starting or fetching chat thread:', error);
    throw error;
  }
};
