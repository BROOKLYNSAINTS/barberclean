import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Button, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateChatResponse } from '@/services/openai';
import * as Speech from 'expo-speech';
import * as SpeechRecognition from 'expo-speech';

const promptPrefix =
  "You are a friendly assistant helping a barber manage and grow their barber business. Answer clearly and practically. ";

export default function ChatAssistantScreen() {
  const [input, setInput] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    const greeting =
      "Hi! I'm your AI assistant. I can help you manage your barber business, answer questions about appointments, services, and marketing. How can I help you today?";
    setChatLog([{ sender: 'bot', text: greeting }]);
    Speech.speak(greeting, {
      language: 'en-US',
      pitch: 1.0,
      rate: 1.0,
    });
  }, []);

  const handleMicPress = async () => {
    // Placeholder: Expo does not have built-in speech-to-text; this is where
    // you would hook up your Google or native STT and then setInput(transcript).
    // For now, just toggle a visual state so the button can be wired later.
    setIsListening(prev => !prev);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: 'user', text: input };
    setChatLog(prev => [...prev, userMsg]);
    setInput('');

    try {
      const result = await generateChatResponse(promptPrefix + input);

      if (!result?.success) {
        const errorText = result?.error || 'Sorry, I had trouble answering that.';
        const botMsg = { sender: 'bot', text: errorText };
        setChatLog(prev => [...prev, botMsg]);
        Speech.speak(errorText, { language: 'en-US', pitch: 1.0, rate: 1.0 });
      } else {
        const reply = result.text;
        const botMsg = { sender: 'bot', text: reply };
        setChatLog(prev => [...prev, botMsg]);
        Speech.speak(reply, { language: 'en-US', pitch: 1.0, rate: 1.0 });
      }
    } catch (e) {
      console.error('Chat assistant error:', e);
      setChatLog(prev => [
        ...prev,
        { sender: 'bot', text: 'Something went wrong talking to the assistant.' },
      ]);
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
        <ScrollView
          style={styles.chatBox}
          ref={scrollRef}
          contentContainerStyle={{ padding: 10 }}
        >
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
  userText: { alignSelf: 'flex-end', marginVertical: 2 },
  botText: { alignSelf: 'flex-start', marginVertical: 2, color: 'blue' },
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
    padding: 10,
    borderRadius: 5,
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
