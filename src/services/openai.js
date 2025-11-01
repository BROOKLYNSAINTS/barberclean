// src/services/openai.js

import Constants from 'expo-constants';

const API_KEY = Constants.expoConfig?.extra?.OPENAI_API_KEY;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export const generateChatResponse = async (text = '', context = []) => {
  if (!API_KEY) {
    console.error("❌ Missing OpenAI API Key");
    return { success: false, error: "Missing API key" };
  }

  const systemMessage = {
    role: 'system',
    content: `You are a helpful assistant for a barbershop app. 
    Do not say "appointment is booked" unless you are explicitly told it was booked. 
    Instead, ask the user to confirm the time, and wait for the app to process the appointment.`
  };

  // ✅ Safely format context into valid message objects
  const formattedContext = Array.isArray(context)
    ? context.map(item =>
        typeof item === 'string'
          ? { role: 'user', content: item }
          : item
      )
    : [];

  const messages = [
    systemMessage,
    ...formattedContext,
    { role: 'user', content: text },
  ];

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices.length > 0) {
      const content = data.choices[0].message.content.trim();
      console.log("🧪 Full OpenAI response:", JSON.stringify(data, null, 2));
      return { success: true, text: content };
    } else {
      console.error("❌ No choices returned:", data);
      return { success: false, error: 'No choices returned' };
    }
  } catch (err) {
    console.error("❌ Fetch error:", err);
    return { success: false, error: err.message || 'Unknown error' };
  }
};

export const assistWithAppointmentBooking = async (userPrompt, availableSlots) => {
  const prompt = `
You are an AI assistant helping schedule barber appointments.
The customer said: "${userPrompt}".
The available time slots are: ${availableSlots.join(', ')}.
Based on the input, suggest the best time slot.
`;

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 100,
      }),
    });

    const data = await response.json();

    if (data?.choices?.length > 0) {
      const text = data.choices[0].message.content;
      const match = text.match(/\b\d{1,2}:\d{2}\b\s?(AM|PM)?/i);
      const suggestedTime = match ? match[0] : null;

      return {
        success: true,
        suggestedTime,
        explanation: text,
      };
    } else {
      return { success: false, error: 'No response from OpenAI.' };
    }
  } catch (err) {
    console.error('❌ AI request failed:', err);
    return { success: false, error: 'AI request failed.' };
  }
};

export const generateHairStyleRecommendation = async (userPreferences) => {
  const { faceShape, hairType, currentLength, stylePreference, occasion } = userPreferences;
  const prompt = `As a professional barber, recommend a hairstyle for a client with:\n- Face shape: ${faceShape}\n- Hair type: ${hairType}\n- Current hair length: ${currentLength}\n- Style preference: ${stylePreference}\n- Occasion: ${occasion}`;

  try {
    const response = await fetch(TEXT_DAVINCI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-davinci-003',
        prompt,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    return data?.choices?.[0]?.text?.trim() || 'No recommendation returned.';
  } catch (error) {
    console.error('❌ Error generating hairstyle recommendation:', error);
    throw error;
  }
};

export const generateMessageTemplate = async (messageType, customerDetails) => {
  const { name, appointmentType, appointmentTime, lastVisit } = customerDetails;
  let prompt = '';

  switch (messageType) {
    case 'appointment_confirmation':
      prompt = `Generate an appointment confirmation for ${name} on ${appointmentTime} for ${appointmentType}.`;
      break;
    case 'appointment_reminder':
      prompt = `Generate an appointment reminder for ${name} on ${appointmentTime} for ${appointmentType}.`;
      break;
    case 'follow_up':
      prompt = `Generate a follow-up message for ${name} who last visited for ${appointmentType} on ${lastVisit}.`;
      break;
    case 'special_offer':
      prompt = `Generate a special offer message for ${name} who last visited for ${appointmentType} on ${lastVisit}.`;
      break;
    default:
      prompt = `Generate a general message for ${name}.`;
  }

  try {
    const response = await fetch(TEXT_DAVINCI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-davinci-003',
        prompt,
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    return data?.choices?.[0]?.text?.trim() || 'No message returned.';
  } catch (error) {
    console.error('❌ Error generating message template:', error);
    throw error;
  }
};

export const generateBarberAdminHelp = async (query) => {
  const prompt = `As a barber shop AI assistant, help with the following query: \"${query}\".`;

  try {
    const response = await fetch(TEXT_DAVINCI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-davinci-003',
        prompt,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    return data?.choices?.[0]?.text?.trim() || 'No help text returned.';
  } catch (error) {
    console.error('❌ Error generating barber admin help:', error);
    throw error;
  }
};
