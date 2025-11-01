// src/services/aiBookingHelper.js

import { db } from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { generateChatResponse } from './openai';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';


// Step 4: Confirm the appointment in Firestore
export const confirmAppointment = async ({ customerId, barberId, service, date, time }) => {
  const appointmentData = {
    customerId,
    barberId,
    serviceId: service.id,
    serviceName: service.name,
    date,
    time,
    status: 'confirmed',
    createdAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, 'appointments'), appointmentData);
  return { id: docRef.id, ...appointmentData };
};

// Step 5a: Schedule notifications (24 hrs and 1 hr before)
export const scheduleReminders = async (title, body, date, time) => {
  const appointmentDate = new Date(`${date}T${time}`);

  const reminders = [24 * 60 * 60 * 1000, 1 * 60 * 60 * 1000]; // ms before appointment

  for (const offset of reminders) {
    const trigger = new Date(appointmentDate.getTime() - offset);
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger,
    });
  }
};

// Step 5b: Add to calendar
export const addToCalendar = async ({ title, notes, date, time }) => {
  const calendars = await Calendar.getCalendarsAsync();
  const defaultCalendar = calendars.find(c => c.allowsModifications);

  if (!defaultCalendar) throw new Error('No writable calendar found');

  const start = new Date(`${date}T${time}`);
  const end = new Date(start.getTime() + 30 * 60 * 1000); // default 30 min

  return Calendar.createEventAsync(defaultCalendar.id, {
    title,
    notes,
    startDate: start,
    endDate: end,
    timeZone: 'local',
  });
};

// Optional: Use last barber/service for returning customer
export const getLastUsedBarberAndService = async (customerId) => {
  const q = query(
    collection(db, 'appointments'),
    where('customerId', '==', customerId)
  );
  const snapshot = await getDocs(q);

  const sorted = snapshot.docs.map(doc => doc.data()).sort(
    (a, b) => b.createdAt?.seconds - a.createdAt?.seconds
  );

  if (sorted.length === 0) return null;

  const last = sorted[0];
  return {
    barberId: last.barberId,
    serviceId: last.serviceId,
    serviceName: last.serviceName,
  };
};

// Combine with AI helper prompt logic
export const askAIForBestTime = async (userInput, availableSlots) => {
  const prompt = `Customer said: "${userInput}"\nAvailable slots: ${availableSlots.join(', ')}\nSuggest the best time.`;
  const response = await generateChatResponse(prompt);

  const match = response.text.match(/\b\d{1,2}:\d{2}\s?(AM|PM)?\b/i);
  return match ? match[0] : null;
};
