// src/services/openai.js

import Constants from 'expo-constants';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Reliable access to Expo "extra" across dev, EAS, and Play release builds.
 */
const getExtra = () => {
  const c = Constants;
  return (
    c.expoConfig?.extra ||
    c.manifest?.extra ||
    c.manifest2?.extra ||
    c.easConfig?.extra ||
    {}
  );
};

/**
 * SINGLE SOURCE OF TRUTH: one key, from Expo extra only.
 */
const getRawApiKey = () => {
  const extra = getExtra();
  return extra.OPENAI_API_KEY || '';
};

const cleanApiKey = (raw) =>
  String(raw || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width chars
    .replace(/[^\x20-\x7E]/g, '')         // remove non-printable ASCII
    .trim();

const getApiKey = () => cleanApiKey(getRawApiKey());

const looksLikeOpenAIKey = (key) =>
  typeof key === 'string' &&
  (key.startsWith('sk-') || key.startsWith('sk-proj-')) &&
  key.length >= 40;

const debugKey = (key) => {
  if (!key) {
    console.log('🔑 OpenAI API Key: MISSING');
    return;
  }
  console.log('🔑 OpenAI key OK:', `${key.slice(0, 6)}...${key.slice(-6)}`, 'len=', key.length);
};

const postChatCompletions = async ({ model, messages, temperature, max_tokens }) => {
  const apiKey = getApiKey();
  debugKey(apiKey);

  if (!looksLikeOpenAIKey(apiKey)) {
    return { success: false, error: 'OpenAI API key missing or invalid at runtime.' };
  }

  let response;
  try {
    response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });
  } catch (err) {
    return { success: false, error: err?.message || 'Network error calling OpenAI.' };
  }

  const bodyText = await response.text();

  if (!response.ok) {
    let parsed;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      parsed = bodyText;
    }
    console.error('❌ OpenAI error:', response.status, parsed);
    return { success: false, status: response.status, error: parsed };
  }

  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch (e) {
    return { success: false, error: 'OpenAI returned non-JSON response.' };
  }

  const text = parsed?.choices?.[0]?.message?.content?.trim?.() || '';
  if (!text) {
    return { success: false, error: 'No assistant text returned from OpenAI.', raw: parsed };
  }

  return { success: true, text, raw: parsed };
};

/**
 * General chat helper (customer / generic).
 */
export const generateChatResponse = async (prompt, opts = {}) => {
  const { model = 'gpt-3.5-turbo', temperature = 0.2, max_tokens = 500 } = opts;

  const messages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: String(prompt || '') },
  ];

  return postChatCompletions({ model, messages, temperature, max_tokens });
};

/**
 * Business / barber admin helper (barber flow).
 */
export const generateBarberAdminHelp = async (query, opts = {}) => {
  const { model = 'gpt-3.5-turbo', temperature = 0.4, max_tokens = 500 } = opts;

  const systemMessage =
    'You are an expert AI assistant for barbers and barbershop owners. ' +
    'You provide clear, practical advice about running and growing a barber business, ' +
    'including pricing, marketing, staffing, customer service, finances, and strategy. ' +
    'Keep answers concrete, friendly, and tailored to small barbershops.';

  const messages = [
    { role: 'system', content: systemMessage },
    { role: 'user', content: String(query || '') },
  ];

  return postChatCompletions({ model, messages, temperature, max_tokens });
};

export default {
  generateChatResponse,
  generateBarberAdminHelp
};
