import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, TextInput, Button, Text, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateChatResponse } from '@/services/openai';
import { useAuth } from '@/contexts/AuthContext';
import {
  createAppointment,
  getUserProfile,
  getBarberServices,
  getBarberAvailability,
  getBarbersByZipcode
} from '@/services/firebase';
import {
  addAppointmentToCalendar,
  scheduleAppointmentReminder,
  requestPermissions
} from '@/services/notifications';
import * as Speech from 'expo-speech';
import Waveform from '@/components/Waveform';

// Google Cloud STT setup placeholder
// You’ll need to install and configure a backend proxy for security
import { startStreamingRecognition, stopStreamingRecognition } from '@/services/googleSpeech';

export function useAutoStartRecording(callback) {
  useEffect(() => {
    const simulate = async () => {
      // simulate voice input or connect real STT logic
    };
    simulate();
  }, []);
}

// Wrap the return and related functions inside a component
function ChatUI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef(null);

  const handleSendMessage = async (text = input) => {
    if (!text.trim()) return;
    const userMessage = { id: Date.now().toString(), text, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const response = await generateChatResponse(text);
      const botMessage = { id: Date.now().toString() + '_bot', text: response, sender: 'bot' };
      setMessages((prev) => [...prev, botMessage]);

    // Speak the assistant's response aloud
      Speech.speak(response, {
      language: 'en-US',
      pitch: 1.0,
      rate: 1.0,
});
      setMessages((prev) => [...prev, botMessage]);
    } catch (e) {
      setError('Failed to generate response.');
    } finally {
      setLoading(false);
    }
  };

const shouldContinue = useRef(false); // survives re-renders

const startVoiceRecognition = async () => {
  shouldContinue.current = true;
  setIsListening(true);

  const listen = async () => {
    try {
      await requestPermissions();
      startStreamingRecognition(
        async (transcript) => {
          if (transcript && shouldContinue.current) {
            await handleSendMessage(transcript);
            // Give user a second before restarting
            setTimeout(() => {
              if (shouldContinue.current) listen();
            }, 500);
          }
        },
        (err) => {
          console.error('Google Speech error:', err);
          setIsListening(false);
        }
      );
    } catch (e) {
      console.error('Voice recognition failed:', e);
      setIsListening(false);
    }
  };

  listen();
};

const stopVoiceRecognition = () => {
  shouldContinue.current = false;
  stopStreamingRecognition();
  setIsListening(false);
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
          <Waveform isListening={isListening} />
        </View>
        <ScrollView
          style={styles.chatBox}
          ref={scrollRef}
          contentContainerStyle={{ padding: 10 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <Text key={msg.id} style={msg.sender === 'user' ? styles.userText : styles.botText}>
              {msg.sender === 'user' ? 'You: ' : 'Assistant: '}{msg.text}
            </Text>
          ))}
          {loading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
              <ActivityIndicator size="small" color="gray" />
              <Text style={{ marginLeft: 6, color: 'gray' }}>Thinking...</Text>
            </View>
          )}
          {error && (
            <Text style={{ marginTop: 5, color: 'red' }}>{error}</Text>
          )}
        </ScrollView>
        <View style={styles.inputContainer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask me anything..."
            style={styles.input}
            onSubmitEditing={() => handleSendMessage()}
          />
          <Button title="Send" onPress={() => handleSendMessage()} disabled={loading} />
          <TouchableOpacity
            onPress={isListening ? stopVoiceRecognition : startVoiceRecognition}
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
    marginLeft: 6
  },
  micActive: {
    backgroundColor: '#ffe6e6',
    borderRadius: 20
  }
});
