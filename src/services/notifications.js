import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { db } from '@/services/firebase';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import * as Calendar from 'expo-calendar';

export async function requestPermissions() {
  try {
    const notifStatus = await Notifications.requestPermissionsAsync();
    console.log('[Permissions] Notifications:', notifStatus);
  } catch (e) {
    console.warn('[Permissions] Notifications request failed', e);
  }
  try {
    const calStatus = await Calendar.requestCalendarPermissionsAsync();
    console.log('[Permissions] Calendar:', calStatus);
  } catch (e) {
    console.warn('[Permissions] Calendar request failed', e);
  }
}

// Utility to convert 12-hour time with unicode spaces to 24-hour format
function to24Hour(timeStr) {
  if (!timeStr) return '';
  // Replace all Unicode and regular spaces with a single space
  timeStr = String(timeStr).replace(/[\u202F\u00A0\u2009\u2007\u200A\u200B\u200C\u200D\uFEFF\s]+/g, ' ').trim();
  // Insert a space before AM/PM if missing
  timeStr = timeStr.replace(/([0-9])([AP]M)$/i, '$1 $2');
  const parts = timeStr.split(' ');
  const time = parts[0];
  const modifier = parts[1] ? parts[1].toUpperCase() : '';
  if (!time) return '';
  let [hours, minutes] = time.split(':');
  hours = hours.padStart(2, '0');
  if (modifier === 'PM' && hours !== '12') {
    hours = String(parseInt(hours, 10) + 12).padStart(2, '0');
  }
  if (modifier === 'AM' && hours === '12') {
    hours = '00';
  }
  return `${hours}:${minutes ? minutes.padStart(2, '0') : '00'}`;
}

function getAppointmentDate(dateStr, timeStr) {
  let time24 = to24Hour(timeStr);
  if (/^\d{2}:\d{2}$/.test(time24)) {
    time24 += ':00';
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
  if (!dateRegex.test(dateStr) || !timeRegex.test(time24)) {
    console.error('Invalid date or time format', { dateStr, timeStr, time24 });
    throw new Error('Invalid date or time format');
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes, seconds] = time24.split(':').map(Number);
  if (
    isNaN(year) || isNaN(month) || isNaN(day) ||
    isNaN(hours) || isNaN(minutes) || (seconds !== undefined && isNaN(seconds))
  ) {
    console.error('Date or time contains NaN', { year, month, day, hours, minutes, seconds });
    throw new RangeError('Date value out of bounds');
  }
  const dateObj = new Date(year, month - 1, day, hours, minutes, seconds || 0);
  if (isNaN(dateObj.getTime())) {
    console.error('Constructed date is invalid', { year, month, day, hours, minutes, seconds });
    throw new RangeError('Date value out of bounds');
  }
  return dateObj;
}

export async function addAppointmentToCalendar(appointment, service = null, barber = null) {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCalendar = calendars.find(cal => cal.allowsModifications) || calendars[0];

  // Sanitize and convert time to 24-hour format
  const time24 = to24Hour(appointment.time);
  const startDateStr = `${appointment.date}T${time24}:00`;
  const startDate = new Date(startDateStr);

  if (isNaN(startDate.getTime())) {
    console.error('Invalid startDate:', { startDateStr, appointment });
    throw new RangeError('Date value out of bounds');
  }

  const duration = (service && service.duration) || 30;
  const endDate = new Date(startDate.getTime() + duration * 60000);

  // ✅ Fallbacks now check appointment.barberAddress and barberPhone
  const serviceName = (service && service.name) || appointment.serviceName || 'Appointment';
  const barberName = (barber && barber.name) || appointment.barberName || 'Barber';
  const barberAddress = (barber && barber.address) || appointment.barberAddress || '';
  const barberPhone = (barber && barber.phone) || appointment.barberPhone || '';

  const eventId = await Calendar.createEventAsync(defaultCalendar.id, {
    title: `${serviceName} with ${barberName}`,
    startDate,
    endDate,
    notes: `Location: ${barberAddress}\nPhone: ${barberPhone}`,
    timeZone: 'America/New_York',
  });

  return eventId;
}

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,          // iOS classic
    shouldPlaySound: true,
    shouldSetBadge: true,
    // keep new fields if SDK supports them:
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Register for push notifications
export const registerForPushNotifications = async () => {
  let token;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return null;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
};

// Save notification token to user profile
export const saveNotificationToken = async (userId, token) => {
  try {
    if (!userId || !token) return;
    
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        notificationToken: token,
        notificationsEnabled: true
      });
    }
  } catch (error) {
    console.error('Error saving notification token:', error);
  }
};

// Update notification settings
export const updateNotificationSettings = async (userId, settings) => {
  try {
    if (!userId) return;
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      notificationSettings: settings
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
  }
};

// Get notification settings
export const getNotificationSettings = async (userId) => {
  try {
    if (!userId) return null;
    
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data().notificationSettings || getDefaultNotificationSettings();
    }
    
    return getDefaultNotificationSettings();
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return getDefaultNotificationSettings();
  }
};

// Default notification settings
export const getDefaultNotificationSettings = () => {
  return {
    appointmentReminders: true,
    appointmentUpdates: true,
    promotions: true,
    bulletinUpdates: true,
    smsNotifications: false
  };
};

// Schedule local notification
export const scheduleLocalNotification = async (title, body, trigger) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

// Save notification to Firestore
export const saveNotificationToFirestore = async (userId, notification) => {
  try {
    if (!userId) {
      console.error('❌ No userId provided to saveNotificationToFirestore');
      return;
    }
    
    console.log('📤 Saving notification to Firestore:', { userId, notification });
    
const notificationRef = doc(db, 'users', userId, 'notifications', notification.id || String(Date.now()));

await setDoc(notificationRef, {
  ...notification,
  timestamp: new Date(),
  read: false,
});
    
    console.log('✅ Notification saved to Firestore successfully:', notification);
  } catch (error) {
    console.error('❌ Error saving notification to Firestore:', error);
  }
};

// Schedule appointment reminder (Hybrid: Local + Firestore)
export const scheduleAppointmentReminder = async (appointment, userId) => {
  const { date, serviceName, barberName } = appointment;
  const appointmentId = appointment.id || appointment.appointmentId;
  console.log('appointment:', appointment);
  console.log('appointmentId:', appointmentId);
  console.log('userId:', userId);
  try {
    const startTime = appointment.startTime || appointment.time;
    if (!date || !startTime) throw new Error('Missing date or time');
    const appointmentDate = getAppointmentDate(date, startTime);
    const oneDayBefore = new Date(appointmentDate.getTime() - 24*60*60*1000);
    const oneHourBefore = new Date(appointmentDate.getTime() - 60*60*1000);

    if (oneDayBefore > new Date()) {
      const oneDayId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Appointment Reminder',
          body: `You have a ${serviceName} appointment with ${barberName} on ${date} at ${startTime}.`,
          sound: true,
          ...(Platform.OS === 'android' ? { priority: Notifications.AndroidNotificationPriority.HIGH } : {}),
          data: { type: 'appointment_reminder', appointmentId }
        },
        trigger: { date: oneDayBefore }
      });
      if (userId) {
        await saveNotificationToFirestore(userId, {
          id: `reminder_24h_${appointmentId}`,
          title: '24-Hour Reminder Set',
          body: `Reminder set for 24 hours before ${date} at ${startTime}.`,
          type: 'appointment_reminder',
          appointmentId,
          appointmentDate: date,
          appointmentTime: startTime,
          serviceName,
          barberName,
          localNotificationId: oneDayId
        });
      }
    }

    if (oneHourBefore > new Date()) {
      const oneHourId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming Appointment',
          body: `Your ${serviceName} appointment with ${barberName} is on ${date} at ${startTime}.`,
          sound: true,
          ...(Platform.OS === 'android' ? { priority: Notifications.AndroidNotificationPriority.HIGH } : {}),
          data: { type: 'appointment_reminder', appointmentId }
        },
        trigger: { date: oneHourBefore }
      });
      if (userId) {
        await saveNotificationToFirestore(userId, {
          id: `reminder_1h_${appointmentId}`,
          title: '1-Hour Reminder Set',
          body: `Reminder set for 1 hour before ${date} at ${startTime}.`,
          type: 'appointment_reminder',
          appointmentId,
          appointmentDate: date,
          appointmentTime: startTime,
          serviceName,
          barberName,
          localNotificationId: oneHourId
        });
      }
    }
    return true;
  } catch (error) {
    console.error('[Reminder Debug] Error scheduling appointment reminder:', error);
    return false;
  }
};

export const cancelAppointmentNotifications = async (appointmentOrId, userId) => {
  try {
    const appointmentId = typeof appointmentOrId === 'string'
      ? appointmentOrId
      : appointmentOrId?.id || appointmentOrId?.appointmentId || null;
    if (!appointmentId) {
      console.warn('[Cancel Notifications] Missing appointmentId');
      return { success:false, cancelledCount:0 };
    }
    console.log('[Cancel Notifications] Cancelling notifications for appointment:', appointmentId);

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('[Cancel Notifications] Found scheduled notifications:', scheduled.length);

    let cancelledCount = 0;
    for (const n of scheduled) {
      if (n?.content?.data?.appointmentId === appointmentId) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
        cancelledCount++;
        console.log('[Cancel Notifications] Cancelled notification:', n.identifier);
      }
    }

    if (userId) {
      try {
        const notificationsRef = collection(db, 'users', userId, 'notifications');
        const qRef = query(notificationsRef, where('appointmentId','==', appointmentId));
        const snap = await getDocs(qRef);
        for (const d of snap.docs) {
          await updateDoc(d.ref, {
            status: 'cancelled',
            cancelledAt: serverTimestamp()
          });
        }
        console.log('[Cancel Notifications] Updated Firestore notifications:', snap.size);
      } catch (e) {
        console.error('[Cancel Notifications] Firestore update error:', e);
      }
    }

    console.log(`✅ Cancelled ${cancelledCount} scheduled notifications for appointment ${appointmentId}`);
    return { success:true, cancelledCount };
  } catch (e) {
    console.error('❌ Error cancelling appointment notifications:', e);
    return { success:false, cancelledCount:0, error:e.message };
  }
};

export const removeAppointmentFromCalendar = async (appointmentOrId) => {
  try {
    const appt = typeof appointmentOrId === 'string' ? { id: appointmentOrId } : (appointmentOrId || {});
    const appointmentId = appt.id || appt.appointmentId || null;
    console.log('[Calendar] Removing appointment from calendar:', appointmentId);

    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[Calendar] Calendar permission not granted');
      return { success:false, reason:'permission' };
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const endDate = new Date(); endDate.setFullYear(endDate.getFullYear() + 1);
    const startDate = new Date(); startDate.setFullYear(startDate.getFullYear() - 1);

    let removedCount = 0;
    for (const calendar of calendars) {
      let events = [];
      try {
        events = await Calendar.getEventsAsync([calendar.id], startDate, endDate);
      } catch {
        continue;
      }
      for (const ev of events) {
        if (!ev.title) continue;
        const serviceName = appt.serviceName;
        const barberName = appt.barberName;
        if (serviceName && barberName) {
          const titleExact = `${serviceName} with ${barberName}`;
          const looseMatch = ev.title.includes(serviceName) && ev.title.includes(barberName);
          if (!(ev.title === titleExact || looseMatch)) continue;
        }
        if (appt.date) {
          const [y,m,d] = appt.date.split('-').map(Number);
          const apptDate = new Date(y,m-1,d);
          const evDate = new Date(ev.startDate);
          const sameDay = evDate.getFullYear()===apptDate.getFullYear() &&
                          evDate.getMonth()===apptDate.getMonth() &&
                          evDate.getDate()===apptDate.getDate();
          if (!sameDay) continue;
        }
        try {
          await Calendar.deleteEventAsync(ev.id);
          removedCount++;
          console.log('[Calendar] Deleted event:', ev.title);
        } catch(e){
          console.warn('[Calendar] delete failed', e);
        }
      }
    }
    console.log(`✅ Removed ${removedCount} calendar events (scan)`);
    return { success:true, removedCount };
  } catch (error) {
    console.error('❌ Error removing appointment from calendar:', error);
    return { success:false, error:error.message };
  }
};

// Add notification listener
export const addNotificationListener = (callback) => {
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return subscription;
};

// Add notification response listener
export const addNotificationResponseListener = (callback) => {
  const subscription = Notifications.addNotificationResponseReceivedListener(callback);
  return subscription;
};

// Test function to create a sample notification (for debugging)
export const createTestNotification = async (userId) => {
  try {
    if (!userId) {
      console.error('No userId provided for test notification');
      return;
    }

    const testNotification = {
      id: `test_${Date.now()}`,
      title: 'Test Notification',
      body: 'This is a test notification to verify the system is working.',
      type: 'test',
      appointmentDate: '2025-07-05',
      appointmentTime: '2:00 PM',
      serviceName: 'Test Service',
      barberName: 'Test Barber',
    };

    await saveNotificationToFirestore(userId, testNotification);
    console.log('✅ Test notification created successfully:', testNotification);
    return testNotification;
  } catch (error) {
    console.error('❌ Error creating test notification:', error);
  }
};

// Test function to schedule immediate reminders (for testing purposes)
export const scheduleTestReminder = async (appointment, userId, testDelaySeconds = 10) => {
  try {
    const { serviceName, barberName, date, time,id } = appointment;
    const startTime = appointment.startTime || time;
    
    console.log(`🧪 Scheduling test reminder in ${testDelaySeconds} seconds...`);
    
    // Schedule a test notification for X seconds from now
    const testId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'TEST: Appointment Reminder',
        body: `TEST REMINDER: You have a ${serviceName} appointment with ${barberName} on ${date} at ${startTime}.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'test_reminder', appointmentId: appointment.id },
      },
      trigger: { seconds: testDelaySeconds },
    });
    
    console.log(`✅ Test reminder scheduled with ID: ${testId} - will fire in ${testDelaySeconds} seconds`);
    
    // Also save to Firestore
    if (userId) {
      await saveNotificationToFirestore(userId, {
        id: `test_reminder_${Date.now()}`,
        title: 'Test Reminder Scheduled',
        body: `A test reminder has been scheduled to fire in ${testDelaySeconds} seconds for your appointment on ${date} at ${startTime}.`,
        type: 'test_reminder',
        appointmentId: appointment.id,
        appointmentDate: date,
        appointmentTime: startTime,
        serviceName: serviceName,
        barberName: barberName,
        localNotificationId: testId,
      });
    }
    
    return testId;
  } catch (error) {
    console.error('❌ Error scheduling test reminder:', error);
  }
};

// ADD (if missing) after other exports, before default export:
export const cancelAllNotifications = async () => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if (Platform.OS === 'ios') {
      try { await Notifications.setBadgeCountAsync(0); } catch {}
    }
    console.log(`[Notifications] Cleared ${scheduled.length} scheduled notifications`);
    return scheduled.length;
  } catch (e) {
    console.error('Error cancelling all notifications:', e);
    return 0;
  }
};

export default {
  requestPermissions,
  addAppointmentToCalendar,
  registerForPushNotifications,
  saveNotificationToken,
  updateNotificationSettings,
  getNotificationSettings,
  getDefaultNotificationSettings,
  scheduleLocalNotification,
  scheduleAppointmentReminder,
  scheduleTestReminder,
  cancelAllNotifications,
  cancelAppointmentNotifications,
  addNotificationListener,
  addNotificationResponseListener,
  createTestNotification,
  removeAppointmentFromCalendar
};
