import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native'; // <-- add
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  Button,
  StyleSheet
} from 'react-native';
import * as Speech from 'expo-speech';
import {
  getUserProfile,
  getBarbersByZipcode,
  getBarberServices,
  getBarberAvailability,
  createAppointment,
  getLastAppointmentForUser,
  cancelAppointment,
  getRecentAppointmentsForUser   // <-- added
} from '@/services/firebase';
import {
  addAppointmentToCalendar,
  requestPermissions,
  scheduleAppointmentReminder,
  cancelAppointmentNotifications,
  removeAppointmentFromCalendar
} from '@/services/notifications';
import Waveform from '@/components/Waveform';
import { generateChatResponse } from '@/services/openai';
import { useAuth } from '@/contexts/AuthContext';
import { serverTimestamp } from 'firebase/firestore';

// ---- ADD (or move) THESE HELPERS TO THE VERY TOP (after imports) ----
function cleanSpaces(s=''){ return (s||'').replace(/[\u202F\u00A0]/g,' ').replace(/\s+/g,' ').trim(); }
function normalizeDisplayTime(t=''){
  t = cleanSpaces(t);
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24 && +m24[1] <= 23){
    let h = +m24[1]; const mins = m24[2]; const mer = h>=12?'PM':'AM';
    if(h===0) h=12; else if(h>12) h-=12;
    return `${h}:${mins} ${mer}`;
  }
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if(!m) return t;
  return `${parseInt(m[1],10)}:${m[2]} ${m[3].toUpperCase()}`;
}
function toTime24(t=''){
  const m = normalizeDisplayTime(t).match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);
  if(!m) return null;
  let h = +m[1]; const mins = m[2]; const mer = m[3];
  if(mer==='PM' && h!==12) h+=12;
  if(mer==='AM' && h===12) h=0;
  return `${h.toString().padStart(2,'0')}:${mins}`;
}
function anyTo24(raw=''){
  raw = cleanSpaces(raw);
  let m = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if(m) return toTime24(`${m[1]}:${m[2]} ${m[3].toUpperCase()}`);
  m = raw.match(/^(\d{1,2})\s*(AM|PM)$/i);
  if(m) return toTime24(`${m[1]}:00 ${m[2].toUpperCase()}`);
  m = raw.match(/^(\d{1,2}):(\d{2})$/);
  if(m && +m[1] <= 23) return `${m[1].padStart(2,'0')}:${m[2]}`;
  return null;
}
function parseDayOffset(text=''){
  const lower=text.toLowerCase();
  if(lower.includes('today')) return 0;
  if(lower.includes('tomorrow')) return 1;
  const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const now=new Date(); const cur=now.getDay();
  for(let i=0;i<days.length;i++){
    if(lower.includes(days[i])){ let d=(i-cur+7)%7; if(d===0)d=7; return d; }
  }
  return null;
}
async function bookAppointment(appointment){
  const display = normalizeDisplayTime(appointment.time);
  const time24 = toTime24(display);
  if(!time24) throw new Error('Invalid time');

  // Optional unique key (uncomment if you need it elsewhere)
  // const userDateTimeKey = `${appointment.customerId}_${appointment.date}_${time24}`;

  const docData = {
    ...appointment,
    time: display,
    time24,
    // userDateTimeKey,
    createdAt: serverTimestamp()
  };

  console.log('[BOOK] create', docData);
  const id = await createAppointment(docData);
  const full = { ...docData, id };

  // Non-fatal side effects
  try { await requestPermissions(); } catch(e){ console.log('[BOOK] perm warn', e); }
  try { await addAppointmentToCalendar(full); } catch(e){ console.log('[BOOK] calendar warn', e); }
  try { await scheduleAppointmentReminder(full, appointment.customerId); } catch(e){ console.log('[BOOK] reminder warn', e); }

  return full;
}
// ---- END HELPERS ----

export default function ChatAssistantScreen() {
  const { currentUser } = useAuth();
  const scrollRef = useRef(null);
  const hasShownMenu = useRef(false);

  if (!currentUser) {
    return (
      <SafeAreaView style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#fff' }}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={{ marginTop:12 }}>Loading user...</Text>
      </SafeAreaView>
    );
  }

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [pendingDateTime, setPendingDateTime] = useState(null);
  const [bookingStep, setBookingStep] = useState('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMenu, setShowMenu] = useState(true);
  const [mode, setMode] = useState(null);
  const [newStep, setNewStep] = useState('idle');
  const [barbersCache, setBarbersCache] = useState([]);
  const [servicesCache, setServicesCache] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [pendingCancel, setPendingCancel] = useState(null);
  const [cancelStage, setCancelStage] = useState('idle'); // idle | list | confirm
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [cancelPick, setCancelPick] = useState(null);
  const [lastAppointment, setLastAppointment] = useState(null);

  const parseNumberChoice = (text) => {
    if (typeof text !== 'string') return null;
    const num = parseInt(text.trim(), 10);
    return isNaN(num) ? null : num;
  };

  // Single formatter helpers (avoid redefining later)
  const listBarbers = (arr = []) =>
    arr.map((b,i)=>`${i+1}. ${b.name}${b.address?' - '+b.address:''}`).join('\n');
  const listServices = (arr = []) =>
    arr.map((s,i)=>`${i+1}. ${s.name}${s.price!=null?` — $${(+s.price).toFixed(2)}`:''}`).join('\n');

  const resetAssistant = useCallback(() => {
    setMessages([]);
    setInput('');
    setPendingDateTime(null);
    setBookingStep('idle');
    setLoading(false);
    setError('');
    setShowMenu(true);
    setMode(null);
    setNewStep('idle');
    setBarbersCache([]);
    setServicesCache([]);
    setSelectedBarber(null);
    setSelectedService(null);
    setSelectedPrice(null);
    setSelectedTime(null);
    setProcessing(false);
    setCancelStage('idle');
    setRecentAppointments([]);
    setCancelPick(null); // <-- fixed missing parenthesis
  }, []);

  // REMOVE the entire duplicate block that started with:
  // // ---------- Helper Utilities (single source of truth) ----------
  // (Delete all those redefinitions of cleanSpaces, normalizeDisplayTime, toTime24, etc.)

  const addBotMessage = (text) =>
    setMessages(prev => [...prev, { id: Date.now().toString(), sender:'bot', text }]);
  const addUserMessage = (text) =>
    setMessages(prev => [...prev, { id: Date.now().toString(), sender:'user', text }]);

  const handleOptionSelect = async (selectedMode) => {
    setMode(selectedMode);
    setMessages([]);
    setInput('');
    setLoading(false);

    if (selectedMode === 'cancel') {
      setCancelStage('list');
      try {
        const recents = await getRecentAppointmentsForUser(currentUser?.uid, 3);
        console.log('[CANCEL] recent appointments', recents);
        setRecentAppointments(recents);
        if (!recents.length) {
          addBotMessage('No appointments found to cancel. Type "menu" to return.');
          Speech.speak('No appointments found to cancel.');
          return;
        }
        const lines = recents.map((a,i)=>`${i+1}. ${a.date} ${a.time} — ${a.serviceName || 'Service'}`).join('\n');
        const msg = `Most recent appointments:\n${lines}\n\nReply with a number (1-${recents.length}) to cancel.`;
        addBotMessage(msg);
        Speech.speak('Reply with a number to cancel.');
        return;
      } catch {
        addBotMessage('Could not load appointments. Type "menu" to return.');
        Speech.speak('Could not load appointments.');
        return;
      }
    }

    if (selectedMode === 'repeat') {
      try {
        const last = await getLastAppointmentForUser(currentUser?.uid);
        if (!last) {
          addBotMessage('No previous appointment found. Use "New" instead.');
          Speech.speak('No previous appointment found. Use new instead.');
          setMode(null);
          return;
        }
        setLastAppointment(last);
        addBotMessage(
          `Repeating last service: ${last.serviceName || 'Service'} with ${last.barberName || 'barber'}.\n` +
          `Provide new day & time (e.g. Friday 9:00 AM).`
        );
        Speech.speak('Provide new day and time.');
      } catch {
        addBotMessage('Could not load last appointment.');
        Speech.speak('Could not load last appointment.');
        setMode(null);
      }
      return;
    }

    const modeMessages = {
      new: "Great! Let’s schedule your new haircut. Would you like to see the barbers I have in your area?",
      repeat: "Booking your previous haircut. What time would you like to come in?",
      pay: "Let’s complete your payment. Do you want to pay with card or wallet?"
    };
    const message = modeMessages[selectedMode] || '';
    if (message) { addBotMessage(message); Speech.speak(message); }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    addUserMessage(userText);
    setInput('');
    setLoading(true);
    setError('');

    // If no mode selected yet, allow picking 1/2/3/4 or names
if (!mode) {
  const t = userText.toLowerCase();
  const pick =
    t === '1' || t.includes('new') ? 'new' :
    t === '2' || t.includes('repeat') || t.includes('previous') ? 'repeat' :
    t === '3' || t.includes('cancel') ? 'cancel' :
    t === '4' || t.includes('pay') ? 'pay' : null;

  if (pick) {
    await handleOptionSelect(pick); // reuse your existing function
    setLoading(false);
    return;
  }

  addBotMessage('Please pick 1, 2, 3, or 4 to continue.');
  Speech.speak('I can help with the following options - press 1, 2, 3, or 4 to continue.');
  setLoading(false);
  return;
}


    try {
      // Cancel flow (last 3)
      if (mode === 'cancel') {
        if (cancelStage === 'list') {
          const num = parseInt(userText,10);
            if (isNaN(num) || num < 1 || num > recentAppointments.length) {
              addBotMessage(`Enter a number 1-${recentAppointments.length}, or type "menu".`);
              Speech.speak(`Enter a number 1-${recentAppointments.length}, or type "menu".`);

              setLoading(false); return;
            }
          const chosen = recentAppointments[num-1];
          setCancelPick(chosen);
          setCancelStage('confirm');
          addBotMessage(`Cancel ${chosen.date} at ${chosen.time}? (yes/no)`);
          Speech.speak('Confirm cancellation yes or no.');
          setLoading(false); return;
        }
        if (cancelStage === 'confirm') {
          if (/^\s*yes\s*$/i.test(userText)) {
            try {
              await cancelAppointment(cancelPick.id, currentUser.uid);
              console.log('[CANCEL] cancelled', cancelPick.id);
              await cancelAppointmentNotifications(cancelPick.id, currentUser.uid);
              await removeAppointmentFromCalendar(cancelPick);
              addBotMessage(`✅ Cancelled ${cancelPick.date} at ${cancelPick.time}.`);
              Speech.speak(`Cancelled ${cancelPick.date} at ${cancelPick.time}.`);
            } catch {
              addBotMessage('❌ Could not cancel. Try again later.');
              Speech.speak('Could not cancel.');
            }
          } else if (/^\s*no\s*$/i.test(userText)) {
            addBotMessage('Not cancelled.');
            Speech.speak('Not cancelled.');
          } else {
            addBotMessage('Reply "yes" or "no".');
            Speech.speak('Reply "yes" or "no".');

            setLoading(false); return;
          }
          // reset cancel state
          setMode(null);
          setCancelStage('idle');
          setRecentAppointments([]);
          setCancelPick(null);
          setLoading(false); return;
        }
        addBotMessage('Type "menu" to return.');
        Speech.speak('Type "menu" to return.');

        setLoading(false);
        return;
      }

      // Repeat booking flow
      if (mode === 'repeat') {
        // Expecting a day+time message
        if (!lastAppointment) {
          addBotMessage('No prior appointment loaded. Type "menu".');
          Speech.speak('No prior appointment loaded. Type "menu".');

          setLoading(false); 
          return;
        }
        const timeMatch = userText.match(/\b\d{1,2}:\d{2}\s?(AM|PM)\b/i);
        const offset = parseDayOffset(userText);
        if (!timeMatch || offset == null) {
          addBotMessage('Please give weekday + time like "Friday 9:00 AM".');
          Speech.speak('Please give weekday + time like "Friday 9:00 AM".');

          setLoading(false); 
          return;
        }
        const requestedDate = new Date(Date.now() + offset*86400000).toISOString().split('T')[0];
        const requestedTime = timeMatch[0];
        // Validate availability for original barber
        const avail = await getBarberAvailability(lastAppointment.barberId);
        const wanted24 = anyTo24(requestedTime);
        const valid = avail.find(a => a.date === requestedDate && anyTo24(a.time) === wanted24);
        if (!valid) {
          const sameDay = avail.filter(a=>a.date===requestedDate).map(a=>a.time);
          addBotMessage(`Not available. Available on ${requestedDate}: ${sameDay.join(', ') || 'None'}`);
          Speech.speak(`Not available. Available on ${requestedDate}: ${sameDay.join(', ') || 'None'}`);

          setLoading(false); 
          return;
        }
        // Confirm immediately then book
        try {
          const appointment = {
            barberId: lastAppointment.barberId,
            barberName: lastAppointment.barberName,
            barberAddress: lastAppointment.barberAddress,
            barberPhone: lastAppointment.barberPhone,
            customerId: currentUser.uid,
            customerName: lastAppointment.customerName || '',
            serviceName: lastAppointment.serviceName,
            servicePrice: lastAppointment.servicePrice ?? null,
            date: requestedDate,
            time: valid.time
          };
          const saved = await bookAppointment(appointment);
          addBotMessage(`✅ Rebooked ${saved.serviceName} at ${saved.time} on ${saved.date}.`);
          Speech.speak(` Rebooked ${saved.serviceName} at ${saved.time} on ${saved.date}.`);

        } catch {
          addBotMessage('❌ Could not rebook.');
          Speech.speak('Could not rebook.');
        }
        // Reset repeat mode
        setMode(null);
        setLastAppointment(null);
        setLoading(false);
        return;
      }

      // New booking flow
      if (mode === 'new') {
        if (newStep === 'idle') {
          const profile = await getUserProfile(currentUser?.uid);
          const barbers = await getBarbersByZipcode(profile?.zipcode || '');
          setBarbersCache(barbers);
          if (!barbers.length) {
            addBotMessage("I couldn’t find barbers near you yet.");
            Speech.speak("I couldn’t find barbers near you yet.");
            setLoading(false); return;
          }
          addBotMessage(`Barbers near ${profile?.zipcode}:\n${listBarbers(barbers)}\n\nReply with a number.`);
          Speech.speak('Reply with a number to choose a barber.');
          setNewStep('chooseBarber');
          setLoading(false); return;
        }

        if (newStep === 'chooseBarber') {
          const idx = parseNumberChoice(userText);
          if (!idx || idx < 1 || idx > barbersCache.length) {
            addBotMessage(`Choose a valid number 1–${barbersCache.length}.`);
            Speech.speak(`Choose a valid number 1–${barbersCache.length}.`);
            setLoading(false); return;
          }
          const b = barbersCache[idx-1];
          setSelectedBarber(b);
          const services = await getBarberServices(b.id);
          setServicesCache(services);
          if (!services.length) {
            addBotMessage('No services for that barber. Type "menu" to restart.');
            Speech.speak('No services for that barber. Type "menu" to restart.');
            setLoading(false); return;
          }
          addBotMessage(`Services:\n${listServices(services)}\n\nReply with a number.`);
          Speech.speak('Reply with a number to choose a service.');
          setNewStep('chooseService');
          setLoading(false); return;
        }

        if (newStep === 'chooseService') {
          const idx = parseNumberChoice(userText);
          if (!idx || idx < 1 || idx > servicesCache.length) {
            addBotMessage(`Choose a valid number 1–${servicesCache.length}.`);
            Speech.speak(`Choose a valid number 1–${servicesCache.length}.`);
            setLoading(false); return;
          }
          const svc = servicesCache[idx-1];
          setSelectedService(svc.name);
          setSelectedPrice(svc.price ?? null);
          addBotMessage(`Selected "${svc.name}" — $${(svc.price ?? 0).toFixed(2)}. Provide day & time (e.g. Friday 9:00 AM).`);
          Speech.speak('Provide day and time.');
          setNewStep('chooseDateTime');
          setLoading(false); return;
        }

        if (newStep === 'chooseDateTime') {
          const timeMatch = userText.match(/\b\d{1,2}:\d{2}\s?(AM|PM)\b/i);
          const offset = parseDayOffset(userText);
          if (!timeMatch || offset == null) {
            addBotMessage('Please say a weekday + time like "Friday 9:00 AM".');
            Speech.speak('Please say a weekday and time like "Friday 9:00 AM".');
            setLoading(false); return;
          }
          const requestedDate = new Date(Date.now() + offset*86400000).toISOString().split('T')[0];
          const requestedTime = timeMatch[0];
          const avail = await getBarberAvailability(selectedBarber.id);
          const wanted24 = anyTo24(requestedTime);
          const valid = avail.find(a => a.date === requestedDate && anyTo24(a.time) === wanted24);
          if (!valid) {
            const sameDay = avail.filter(a=>a.date===requestedDate).map(a=>a.time);
            addBotMessage(`Not available. Available on ${requestedDate}: ${sameDay.join(', ') || 'None'}`);
            Speech.speak(`Not available. Available on ${requestedDate}: ${sameDay.join(', ') || 'None'}`);
            setLoading(false); return;
          }
          setSelectedTime({ date: requestedDate, time: valid.time });
          addBotMessage(`Confirm ${valid.time} on ${requestedDate}? (yes/no)`);
          Speech.speak('Confirm yes or no.');
          setNewStep('confirm');
          setLoading(false); return;
        }

        if (newStep === 'confirm') {
          if (!/^\s*yes\s*$/i.test(userText)) {
            addBotMessage('Not confirmed. Provide another day/time or type "menu".');
            Speech.speak('Not confirmed. Provide another day and time or type "menu".');
            setLoading(false); return;
          }
          const profile = await getUserProfile(currentUser?.uid);
          const appointment = {
            barberId: selectedBarber.id,
            barberName: selectedBarber.name,
            barberAddress: selectedBarber.address,
            barberPhone: selectedBarber.phone,
            customerId: currentUser.uid,
            customerName: profile?.name || '',
            serviceName: selectedService,
            servicePrice: selectedPrice ?? null,
            date: selectedTime.date,
            time: selectedTime.time
          };
          try {
            const saved = await bookAppointment(appointment);
            addBotMessage(`✅ Booked with ${saved.barberName} for "${saved.serviceName}" at ${saved.time} on ${saved.date}.`);
            Speech.speak(`Booked at ${saved.time} on ${saved.date}.`);
          } catch {
            addBotMessage('❌ Booking failed. Try again.');
            Speech.speak('Booking failed. Try again.');
          }
          // reset booking state
          setMode(null);
          setNewStep('idle');
          setBarbersCache([]); setServicesCache([]);
          setSelectedBarber(null); setSelectedService(null);
            setSelectedPrice(null); setSelectedTime(null);
          setLoading(false); return;
        }
      }

      // Other modes (repeat/pay) or AI logic (optional) can go here.

    } catch (e) {
      console.error('[handleSendMessage]', e);
      addBotMessage('Unexpected error.');
      Speech.speak('Unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  if (scrollRef.current) {
    try { scrollRef.current.scrollToEnd({ animated:true }); } catch {}
  }
}, [messages]);

  useFocusEffect(
    useCallback(() => {
      // Reset all conversational state when screen gains focus
      resetAssistant();
      hasShownMenu.current = false; // allow menu to show again
      // Defer one tick so reset finishes before adding menu
      setTimeout(() => {
        const menuText =
          "What would you like to do?\n" +
          "1) New Appointment\n" +
          "2) Repeat Appointment\n" +
          "3) Cancel Appointment\n" +
          "4) Pay Your Bill\n" +
          "Type a number or option name.";
        addBotMessage(menuText);
        try { Speech.speak("Choose an option: 1 new, 2 repeat, 3 cancel, or 4 pay."); } catch {}
        hasShownMenu.current = true;
      }, 0);
      return () => {
        // (optional) cleanup if needed
      };
    }, [resetAssistant])
  );

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#fff' }}>
      <View style={styles.modeRow}>
        <TouchableOpacity onPress={()=>handleOptionSelect('new')} style={[styles.modeBtn, mode==='new' && styles.modeBtnActive]}>
          <Text style={styles.modeBtnText}>New Appt</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>handleOptionSelect('repeat')} style={[styles.modeBtn, mode==='repeat' && styles.modeBtnActive]}>
          <Text style={styles.modeBtnText}>Previous Appt</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>handleOptionSelect('cancel')} style={[styles.modeBtn, mode==='cancel' && styles.modeBtnActive]}>
          <Text style={styles.modeBtnText}>Cancel Appt</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>handleOptionSelect('pay')} style={[styles.modeBtn, mode==='pay' && styles.modeBtnActive]}>
          <Text style={styles.modeBtnText}>Pay Bill</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        ref={scrollRef}
        data={messages}
        keyExtractor={i=>i.id}
        renderItem={({item})=>(
          <View style={{ marginVertical:6 }}>
            <Text style={{ fontWeight:item.sender==='bot'?'600':'400' }}>
              {item.sender==='bot' ? `Assistant: ${item.text}` : `You: ${item.text}`}
            </Text>
          </View>
        )}
        contentContainerStyle={{ padding:16, paddingBottom:120 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type your message..."
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 20,
            padding: 10,
            marginRight: 8,
          }}
        />
        <TouchableOpacity
          onPress={handleSendMessage}
          style={{
            backgroundColor: '#007bff',
            borderRadius: 20,
            paddingVertical: 10,
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Send</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modeBtn:{ backgroundColor:'#007bff', paddingVertical:8, paddingHorizontal:14, borderRadius:16, marginRight:8 },
  modeBtnText:{ color:'#fff', fontWeight:'600' },
  modeRow: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modeBtnActive: {
    backgroundColor: '#005fcc',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messageContainer: {
    marginVertical: 8,
  },
  botMessage: {
    fontWeight: 'bold',
  },
  userMessage: {
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    padding: 10,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#007bff',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});


