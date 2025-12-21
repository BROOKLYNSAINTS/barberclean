// app/(app)/(barber)/chat.js

import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

function unwrapThreadId(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value.threadId === 'string') return value.threadId;
  return '';
}

export default function BarberChatScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const rawParams = useLocalSearchParams();
  const threadId = unwrapThreadId(rawParams.threadId);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  if (!currentUser?.uid) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading user...</Text>
      </SafeAreaView>
    );
  }

  if (!threadId) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
        <Text style={styles.errorTitle}>Chat Error</Text>
        <Text style={styles.errorText}>No valid chat thread ID was found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const messageText = newMessage.trim();

      const messagesRef = collection(db, 'chatThreads', threadId, 'messages');
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        text: messageText,
        createdAt: serverTimestamp(),
      });

      const threadRef = doc(db, 'chatThreads', threadId);
      await updateDoc(threadRef, {
        lastMessage: messageText,
        updatedAt: serverTimestamp(),
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const messagesQuery = query(
      collection(db, 'chatThreads', threadId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const fetched = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setMessages(fetched);
        setLoading(false);
      },
      (err) => {
        console.error('onSnapshot error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [threadId]);

  const renderItem = ({ item }) => {
    const isMine = item.senderId === currentUser.uid;

    return (
      <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
        <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
          {item.text}
        </Text>

        {!!item.createdAt?.toDate && (
          <Text style={[styles.messageTime, isMine ? styles.myMessageTime : styles.theirMessageTime]}>
            {new Date(item.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 10}
      >
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              style={styles.input}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              multiline
              maxLength={500}
              editable={!sending}
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={[styles.sendButton, (sending || newMessage.trim() === '') && styles.sendButtonDisabled]}
              disabled={sending || newMessage.trim() === ''}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  keyboardContainer: { flex: 1 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 16 },

  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5', padding: 20 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 8 },
  errorText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  backButton: { backgroundColor: '#007BFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  backButtonText: { color: '#fff', fontWeight: 'bold' },

  messagesList: { padding: 16, paddingBottom: 20, flexGrow: 1 },

  messageBubble: {
    padding: 12,
    marginVertical: 2,
    borderRadius: 18,
    maxWidth: '80%',
  },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#007BFF', marginLeft: '20%' },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#fff', marginRight: '20%', borderWidth: 1, borderColor: '#e0e0e0' },

  messageText: { fontSize: 16 },
  myMessageText: { color: '#fff' },
  theirMessageText: { color: '#333' },

  messageTime: { fontSize: 11, marginTop: 4 },
  myMessageTime: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  theirMessageTime: { color: '#999', textAlign: 'left' },

  inputContainer: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', padding: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#f8f9fa', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8 },
  input: { flex: 1, fontSize: 16, color: '#333', maxHeight: 100 },
  sendButton: { marginLeft: 12, backgroundColor: '#007BFF', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#ccc' },
});
