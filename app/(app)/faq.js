import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const faqs = [
  {
    q: 'How do I book an appointment?',
    a: 'Go to the Home section, enter your zip code, choose a barber, select a service and time, then confirm your booking.'
  },
  {
    q: 'How do I tip my barber?',
    a: 'Open your appointment details or the Tip screen after your service. Select a tip amount or enter a custom value, then complete payment through the secure payment sheet.'
  },
  {
    q: 'Where can I see my upcoming and past appointments?',
    a: 'Visit the Appointments screen. Upcoming bookings appear at the top; past appointments include status and any recorded tips.'
  },
  {
    q: 'How do payments work?',
    a: 'Payments are processed securely via Stripe. You may be prompted to add or confirm a card in the payment sheet. Successful payments will show a confirmation within the app.'
  },
  {
    q: 'Can I change or cancel a booking?',
    a: 'Modify or cancel from the appointment details screen, subject to your barber’s cancellation policy. Some bookings may be locked close to the start time.'
  },
  {
    q: 'I’m not receiving notifications',
    a: 'Ensure notifications are enabled in your device settings and within the app. Also verify you are logged in with the correct account.'
  },
  {
    q: 'How do I update my profile?',
    a: 'Open Edit Profile from your dashboard or profile tab to update your name, contact info, and other details.'
  },
  {
    q: 'I can’t sign in',
    a: 'Use the “Forgot Password” option on the login screen to reset your credentials. If the issue persists, try updating the app or checking your internet connection.'
  },
  {
    q: 'How do I contact my barber?',
    a: 'From an appointment, tap the Contact button to call or email the barber if contact details are available.'
  },
];

const FAQItem = ({ item, isOpen, onToggle }) => {
  return (
    <View style={styles.itemContainer}>
      <TouchableOpacity style={styles.itemHeader} onPress={onToggle}>
        <Text style={styles.itemQuestion}>{item.q}</Text>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#333" />
      </TouchableOpacity>
      {isOpen ? (
        <View style={styles.itemBody}>
          <Text style={styles.itemAnswer}>{item.a}</Text>
        </View>
      ) : null}
    </View>
  );
};

export default function FAQScreen() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>FAQs</Text>
        <Text style={styles.subtitle}>Quick answers to common questions</Text>
      </View>

      <View style={styles.content}>
        {faqs.map((item, idx) => (
          <FAQItem
            key={idx}
            item={item}
            isOpen={openIndex === idx}
            onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
          />
        ))}
      </View>

      <View style={styles.footerCard}>
        <Ionicons name="help-circle-outline" size={24} color="#2196F3" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.footerTitle}>Still need help?</Text>
          <Text style={styles.footerText}>
            Check your appointment details or reach out to your barber directly from the app. If something looks off, try refreshing the app or signing out and back in.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  itemContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  itemQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    color: '#333',
  },
  itemBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  itemAnswer: {
    fontSize: 15,
    color: '#444',
    lineHeight: 20,
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    borderColor: '#bbdefb',
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 16,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#0d47a1',
  },
  footerText: {
    fontSize: 14,
    color: '#0d47a1',
  },
});
