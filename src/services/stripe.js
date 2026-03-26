import {
  initStripe,
  useStripe,
  StripeProvider,
  CardField,
} from "@stripe/stripe-react-native";
import Constants from "expo-constants";
import { auth } from "@/services/firebase";

const extra = Constants.expoConfig?.extra;

const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  extra?.stripePublishableKey;

const VERCEL_BYPASS = process.env.EXPO_PUBLIC_VERCEL_BYPASS_SECRET;

function getBackendUrl() {
  return extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;
}

async function parseResponsePayload(response) {
  const raw = await response.text();
  if (!raw) return { data: null, raw: "" };

  try {
    return { data: JSON.parse(raw), raw };
  } catch {
    return { data: null, raw };
  }
}

function resolveBackendErrorMessage(data, raw, fallback) {
  if (typeof data?.error === "string" && data.error) return data.error;
  if (typeof data?.message === "string" && data.message) return data.message;
  if (typeof raw === "string" && raw.trim()) return raw.trim().slice(0, 200);
  return fallback;
}

async function getAuthHeaders() {
  const base = { "Content-Type": "application/json" };
  try {
    const user = auth.currentUser;
    if (!user) return base;
    const token = await user.getIdToken(true);
    return { ...base, Authorization: `Bearer ${token}` };
  } catch {
    return base;
  }
}

async function createConnectAccount({ userId, email }) {
  const BACKEND_URL = getBackendUrl();
  if (!BACKEND_URL) throw new Error("Backend not configured");

  const headers = await getAuthHeaders();

  const url = `${BACKEND_URL}/api/create-connect-account${
    VERCEL_BYPASS ? `?x-vercel-protection-bypass=${VERCEL_BYPASS}` : ""
  }`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      userId,
      email,
      businessType: "individual",
    }),
  });

  const { data, raw } = await parseResponsePayload(response);

  if (!response.ok) {
    throw new Error(
      resolveBackendErrorMessage(data, raw, "Failed to create Connect account")
    );
  }

  return {
    accountId: data?.accountId || null,
    onboardingUrl: data?.onboardingUrl || null,
  };
}

/* =========================================================
   INITIALIZE STRIPE (ONLY FOR PAYMENTS, NOT SUBSCRIPTIONS)
========================================================= */
export const initializeStripe = async () => {
  await initStripe({
    publishableKey: STRIPE_PUBLISHABLE_KEY,
    merchantIdentifier: "merchant.com.barberapp",
    urlScheme: "barberclean",
  });
};

/* =========================================================
   BARBER SUBSCRIPTION (REVENUECAT VERSION)
========================================================= */

export const createSubscriptionPaymentSheet = async (
  stripeHook,
  userId,
  priceId,
  customerEmail
) => {

  if (!userId) throw new Error("Missing userId");
  if (!customerEmail) throw new Error("Missing customerEmail");

  // ✅ ONLY CREATE STRIPE CONNECT ACCOUNT
  // ❌ NO STRIPE SUBSCRIPTION
  // ❌ NO priceId usage

  const connect = await createConnectAccount({
    userId,
    email: customerEmail,
  });

  return {
    success: true,
    connectAccountId: connect.accountId,
    onboardingUrl: connect.onboardingUrl,
  };
};

export { useStripe, StripeProvider, CardField };

export default {
  initializeStripe,
  createSubscriptionPaymentSheet,
  useStripe,
  StripeProvider,
  CardField,
};