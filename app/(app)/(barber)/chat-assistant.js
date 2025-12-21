import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Button,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateBarberAdminHelp } from '@/services/openai';
import * as Speech from 'expo-speech';

export default function ChatAssistantScreen() {
  const [input, setInput] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const greeting =
      "Hi! I'm your AI assistant. I can help you with pricing, marketing, staffing, customer experience, and day-to-day barber business questions. How can I help you today?";

    setChatLog([{ sender: 'bot', text: greeting }]);

    Speech.speak(greeting, { language: 'en-US', pitch: 1.0, rate: 1.0 });
  }, []);

  const handleMicPress = async () => {
    // Placeholder only. expo-speech is text-to-speech, not speech-to-text.
    setIsListening((prev) => !prev);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg = { sender: 'user', text: trimmed };
    setChatLog((prev) => [...prev, userMsg]);
    setInput('');

    try {
      const result = await generateBarberAdminHelp(trimmed);

      if (!result?.success) {
        // If OpenAI returns a JSON error object, show something readable
        const err = result?.error;
        const friendly =
          typeof err === 'string'
            ? err
            : err?.error?.message || err?.message || 'Sorry, I had trouble answering that.';

        setChatLog((prev) => [...prev, { sender: 'bot', text: friendly }]);
        Speech.speak(friendly, { language: 'en-US', pitch: 1.0, rate: 1.0 });
      } else {
        const reply = result.text;
        setChatLog((prev) => [...prev, { sender: 'bot', text: reply }]);
        Speech.speak(reply, { language: 'en-US', pitch: 1.0, rate: 1.0 });
      }
    } catch (e) {
      console.error('Chat assistant error:', e);
      const msg = 'Something went wrong talking to the assistant.';
      setChatLog((prev) => [...prev, { sender: 'bot', text: msg }]);
      Speech.speak(msg, { language: 'en-US', pitch: 1.0, rate: 1.0 });
    }

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat Assistant</Text>
        </View>

        <ScrollView ref={scrollRef} style={styles.chatBox} contentContainerStyle={{ padding: 10 }}>
          {chatLog.map((msg, index) => (
            <Text key={index} style={msg.sender === 'user' ? styles.userText : styles.botText}>
              {msg.sender === 'user' ? 'You: ' : 'Assistant: '}
              {msg.text}
            </Text>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask me anything..."
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="sentences"
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <Button title="Send" onPress={sendMessage} />
          <TouchableOpacity
            onPress={handleMicPress}
            style={[styles.micButton, isListening && styles.micActive]}
          >
            <Text style={{ fontSize: 20 }}>{isListening ? '🔴' : '🎤'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 48,
    paddingBottom: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  chatBox: { flex: 1 },
  userText: { alignSelf: 'flex-end', marginVertical: 6 },
  botText: { alignSelf: 'flex-start', marginVertical: 6, color: '#1565C0' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 6,
    marginRight: 8,
  },
  micButton: {
    padding: 10,
    marginLeft: 6,
  },
  micActive: {
    backgroundColor: '#ffe6e6',
    borderRadius: 20,
  },
});
