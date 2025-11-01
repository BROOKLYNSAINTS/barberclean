import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateChatResponse } from '@/services/openai'; // Adjusted path
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
// import * as Voice from 'expo-speech'; // Voice seems to be a duplicate of Speech or intended for expo-voice (deprecated)
// For voice input, consider using a library like react-native-voice or expo-av for recording and then sending to a Speech-to-Text API
// For simplicity, I'll assume expo-speech is for Text-to-Speech and voice input might need a different setup if Voice.start was from a different library.
// If expo-speech was intended for STT as well, its API might have changed. For now, commenting out Voice specific parts if they cause issues.

const ChatScreen = () => {
  const [messages, setMessages] = useState([
    { id: '1', text: "Hello! I'm your barber shop assistant. How can I help you today?", sender: 'assistant' },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false); // This state might be unused if Voice API is problematic
  const [error, setError] = useState('');
  const [conversationState, setConversationState] = useState({
    step: 'start', // start, zip, barber, service, datetime, confirm
    zip: '',
    barber: null,
    service: null,
    datetime: null,
  });
  const scrollViewRef = useRef();
  const router = useRouter();
  // Commenting out Voice related useEffects as expo-speech might not provide this STT functionality directly
  // and expo-voice is deprecated. This part would need a dedicated STT solution.
  /*
  useEffect(() => {
    const setupVoice = async () => {
      try {
        // await Voice.initialize(); // Assuming Voice was from a different library or expo-speech's older API
      } catch (e) {
        console.error('Failed to initialize Voice', e);
      }
    };

    setupVoice();
    return () => {
      // Voice.destroy().then(Voice.removeAllListeners); // Clean up for the specific Voice library
    };
  }, []);

  useEffect(() => {
    // Voice.onSpeechStart = () => setIsListening(true);
    // Voice.onSpeechEnd = () => setIsListening(false);
    // Voice.onSpeechError = (e) => {
    //   console.error('Speech recognition error', e);
    //   setIsListening(false);
    //   setError('Speech recognition failed. Please try again.');
    // };
    // Voice.onSpeechResults = (e) => {
    //   if (e.value?.length > 0) {
    //     setInputText(e.value[0]);
    //     setTimeout(() => handleSendMessage(e.value[0]), 500);
    //   }
    // };
  }, []);
  */

  const startListening = async () => {
    // This function would need to be re-implemented with a proper Speech-to-Text library
    setError('Voice input is not configured in this version.');
    setIsListening(false);
    // try {
    //   if (isListening) {
    //     // await Voice.stop();
    //     setIsListening(false);
    //   } else {
    //     setError('');
    //     // await Voice.start('en-US');
    //   }
    // } catch (e) {
    //   console.error('Error starting voice recognition', e);
    //   setError('Failed to start voice recognition. Please try again.');
    // }
  };

  const speakMessage = (text) => {
    Speech.speak(text, {
      language: 'en',
      pitch: 1.0,
      rate: 0.9,
    });
  };

  const handleSendMessage = async (text = inputText) => {
    if (!text.trim()) return;

    const userMessage = { id: Date.now().toString(), text, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    setError('');

    try {
      const context = messages.slice(-4).map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));

      const response = await generateChatResponse(text, context);

      if (response.success) {
        const assistantMessage = {
          id: Date.now().toString(), // Ensure unique ID
          text: response.text,
          sender: 'assistant',
        };
        if (response.text.toLowerCase().includes('book') || response.text.toLowerCase().includes('appointment')) {
        router.push('/(app)/(customer)/index');
        }
        else  
          if (response.text.toLowerCase().includes('payment')) { response.text = 'To proceed with payment, please select a service and barber first.'; }
        setInputText('');
        setMessages((prev) => [...prev, assistantMessage]);
        speakMessage(response.text);
      } else {
        setError('Failed to get a response. Please try again.');
      }
    } catch (error) {
      console.error('Error in chat:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }

    // Step 1: Ask for zip code if not known
    if (conversationState.step === 'start') {
      if (!customer.zip) {
        setConversationState({ ...conversationState, step: 'zip' });
        setMessages(prev => [...prev, { id: Date.now().toString(), text: "What's your zip code?", sender: 'assistant' }]);
        return;
      } else {
        setConversationState({ ...conversationState, step: 'barber', zip: customer.zip });
      }
    }

    // Step 2: List barbers in zip code
    if (conversationState.step === 'zip') {
      // Validate zip, fetch barbers
      const barbers = await fetchBarbersByZip(text);
      if (barbers.length === 0) {
        setMessages(prev => [...prev, { id: Date.now().toString(), text: "Sorry, no barbers found in that area. Try another zip code?", sender: 'assistant' }]);
        return;
      }
      setConversationState({ ...conversationState, step: 'barber', zip: text });
      setMessages(prev => [...prev, { id: Date.now().toString(), text: `Here are barbers in your area: ${barbers.map(b => b.name).join(', ')}. Which barber would you like to book?`, sender: 'assistant' }]);
      return;
    }

    // Step 3: List services for selected barber
    if (conversationState.step === 'barber') {
      const selectedBarber = await fetchBarberByName(text, conversationState.zip);
      if (!selectedBarber) {
        setMessages(prev => [...prev, { id: Date.now().toString(), text: "I couldn't find that barber. Please choose from the list.", sender: 'assistant' }]);
        return;
      }
      setConversationState({ ...conversationState, step: 'service', barber: selectedBarber });
      setMessages(prev => [...prev, { id: Date.now().toString(), text: `Here are services offered by ${selectedBarber.name}: ${selectedBarber.services.join(', ')}. Which service would you like?`, sender: 'assistant' }]);
      return;
    }

    // Step 4: Ask for date and time
    if (conversationState.step === 'service') {
      const selectedService = text; // You may want to validate this
      setConversationState({ ...conversationState, step: 'datetime', service: selectedService });
      setMessages(prev => [...prev, { id: Date.now().toString(), text: "What date and time would you like for your appointment?", sender: 'assistant' }]);
      return;
    }

    // Step 5: Check availability and confirm
    if (conversationState.step === 'datetime') {
      const requestedDateTime = text; // Parse/validate date/time
      const isAvailable = await checkBarberAvailability(conversationState.barber.id, requestedDateTime);
      if (!isAvailable) {
        const alternatives = await suggestAlternativeTimes(conversationState.barber.id, requestedDateTime);
        setMessages(prev => [...prev, { id: Date.now().toString(), text: `Sorry, that time isn't available. Here are some alternatives: ${alternatives.join(', ')}`, sender: 'assistant' }]);
        return;
      }
      setConversationState({ ...conversationState, step: 'confirm', datetime: requestedDateTime });
      setMessages(prev => [...prev, { id: Date.now().toString(), text: `Great! Your appointment is set for ${requestedDateTime}. Would you like to confirm?`, sender: 'assistant' }]);
      return;
    }

    // Step 6: Final confirmation and reminders
    if (conversationState.step === 'confirm') {
      if (text.toLowerCase().includes('yes')) {
        await bookAppointment(conversationState);
        await addToCalendar(conversationState);
        setMessages(prev => [...prev, { id: Date.now().toString(), text: "Your appointment is confirmed! You'll get a reminder 24 hours and 1 hour before.", sender: 'assistant' }]);
        setConversationState({ step: 'start', zip: '', barber: null, service: null, datetime: null });
        return;
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), text: "Okay, let me know if you'd like to reschedule.", sender: 'assistant' }]);
        setConversationState({ step: 'start', zip: '', barber: null, service: null, datetime: null });
        return;
      }
    }

    // ...existing OpenAI fallback logic...
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat Assistant</Text>
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.sender === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text style={message.sender === 'user' ? styles.userText : styles.assistantText}>{message.text}</Text>
          </View>
        ))}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[styles.voiceButton, isListening && styles.listeningButton]}
          onPress={startListening} // This will show an error message for now
        >
          <Ionicons name={isListening ? 'radio' : 'mic'} size={24} color={isListening ? '#f44336' : '#2196F3'} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          multiline
        />

        <TouchableOpacity
          style={styles.sendButton}
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || loading}
        >
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    paddingTop: 64, // Move title further down
    paddingBottom: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 24 },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#2196F3',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userText: { fontSize: 16, color: '#fff' },
  assistantText: { fontSize: 16, color: '#333' },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 16,
    marginBottom: 12,
  },
  loadingText: { marginLeft: 8, fontSize: 14, color: '#666' },
  errorText: { color: '#f44336', alignSelf: 'center', marginBottom: 12 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  voiceButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  listeningButton: {
    backgroundColor: '#ffebee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 10,
    maxHeight: 100,
    marginHorizontal: 8,
  },
  sendButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#2196F3',
  },
});

export default ChatScreen;


