import React, { useState, useRef } from 'react';
import { View, TextInput, Button, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateChatResponse } from '@/services/openai';
import Speech from 'expo-speech'; // Ensure you have this package installed 

export default function ChatAssistantScreen() {
  const [input, setInput] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const scrollRef = useRef();

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: 'user', text: input };
    setChatLog(prev => [...prev, userMsg]);

    const botReply = await generateChatResponse(input);
    setChatLog(prev => [...prev, { sender: 'bot', text: botReply }]);
    setInput('');
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
});
