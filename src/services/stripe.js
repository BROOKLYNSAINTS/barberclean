import {
  initStripe,
  useStripe,
  StripeProvider,
  CardField,
} from "@stripe/stripe-react-native";
import Constants from "expo-constants";
import { auth, getUserProfile, updateUserProfile } from "@/services/firebase";

const extra = Constants.expoConfig?.extra;

const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  extra?.stripePublishableKey;

const VERCEL_BYPASS = process.env.EXPO_PUBLIC_VERCEL_BYPASS_SECRET;

function getBackendUrl() {
  return extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;
}

function buildBackendUrl(pathname) {
  const base = getBackendUrl();
  if (!base) throw new Error("Backend not configured");

  const separator = pathname.includes("?") ? "&" : "?";
  return `${base}${pathname}${
    VERCEL_BYPASS ? `${separator}x-vercel-protection-bypass=${VERCEL_BYPASS}` : ""
  }`;
}

/* =========================================================
   🔥 UPDATED NORMALIZER (SUPPORT AUTO CHARGE)
========================================================= */
function normalizePaymentIntentPayload(data) {
  // AUTO CHARGE CASE (TIP)
  if (data?.paymentIntentId && !data?.clientSecret) {
    return {
      paymentIntentId: data.paymentIntentId,
      isAutoCharge: true,
    };
  }

  // PAYMENT SHEET CASE (SERVICE)
  const customerId = data?.customerId || data?.customer || data?.stripeCustomerId;
  const ephemeralKey = data?.ephemeralKey || data?.customerEphemeralKeySecret;
  const clientSecret =
    data?.clientSecret || data?.paymentIntentClientSecret || data?.setupIntentClientSecret;
  const paymentIntentId = data?.paymentIntentId || data?.id || null;

  return {
    customerId,
    ephemeralKey,
    clientSecret,
    paymentIntentId,
    isAutoCharge: false,
  };
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

/* =========================================================
   🔥 UPDATED REQUEST HANDLER
========================================================= */
async function createPaymentIntentRequest(payload, fallbackMessage = "Payment setup failed") {
  const headers = await getAuthHeaders();

  const response = await fetch(buildBackendUrl("/api/create-payment-intent"), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const { data, raw } = await parseResponsePayload(response);

  if (!response.ok) {
    throw new Error(resolveBackendErrorMessage(data, raw, fallbackMessage));
  }

  const normalized = normalizePaymentIntentPayload(data);

  // ✅ AUTO CHARGE (TIP)
  if (normalized.isAutoCharge) {
    return normalized;
  }

  // ✅ PAYMENT SHEET (SERVICE)
  if (!normalized.customerId || !normalized.ephemeralKey || !normalized.clientSecret) {
    throw new Error("Invalid payment intent response from backend");
  }

  return normalized;
}

/* =========================================================
   CUSTOMER PROFILE
========================================================= */
async function resolveCustomerPaymentProfile() {
  const user = auth.currentUser;
  if (!user?.uid) throw new Error("Please sign in to continue");

  const profile = (await getUserProfile(user.uid)) || {};

  return {
    userId: user.uid,
    customerName: profile?.name || user.displayName || "Customer",
    customerEmail: profile?.email || user.email,
    stripeCustomerId: profile?.stripeCustomerId || null,
    defaultPaymentMethodId: profile?.defaultPaymentMethodId || null,
  };
}

/* =========================================================
   INIT STRIPE
========================================================= */
export const initializeStripe = async () => {
  await initStripe({
    publishableKey: STRIPE_PUBLISHABLE_KEY,
    merchantIdentifier: "merchant.com.barberapp",
    urlScheme: "barberclean",
  });
};

/* =========================================================
   TIP FLOW (AUTO CHARGE)
========================================================= */
export const createTipPaymentSheet = async (
  stripe,
  userId,
  amount,
  appointmentId,
  barberId
) => {
  const parsedAmount = Number(amount);

  if (!parsedAmount || parsedAmount <= 0) {
    throw new Error("Invalid tip amount");
  }

  const {
    userId: resolvedUserId,
    stripeCustomerId,
    defaultPaymentMethodId,
  } = await resolveCustomerPaymentProfile();

  if (!stripeCustomerId || !defaultPaymentMethodId) {
    throw new Error("Missing saved payment method");
  }

  return createPaymentIntentRequest({
    customerId: resolvedUserId,
    stripeCustomerId,
    defaultPaymentMethodId,
    barberId,
    appointmentId,
    amount: parsedAmount,
    type: "tip",
  });
};

/* =========================================================
   SERVICE FLOW (PAYMENT SHEET)
========================================================= */
export const createAndPresentServicePaymentSheet = async (
  stripe,
  { appointmentId, barberId, amount, serviceName }
) => {
  try {
    const parsedAmount = Number(amount);

    const paymentIntent = await createPaymentIntentRequest({
      appointmentId,
      barberId,
      amount: parsedAmount,
      type: "service",
      description: serviceName,
    });

    const init = await stripe.initPaymentSheet({
      merchantDisplayName: "ScheduleSync",
      customerId: paymentIntent.customerId,
      customerEphemeralKeySecret: paymentIntent.ephemeralKey,
      paymentIntentClientSecret: paymentIntent.clientSecret,
    });

    if (init.error) throw new Error(init.error.message);

    const present = await stripe.presentPaymentSheet();

    if (present.error) {
      if (present.error.code === "Canceled") {
        return { success: false, canceled: true };
      }
      throw new Error(present.error.message);
    }

    return { success: true };

  } catch (error) {
    console.error("Service payment error:", error);
    return { success: false, error };
  }
};

export { useStripe, StripeProvider, CardField };

export default {
  initializeStripe,
  createTipPaymentSheet,
  createAndPresentServicePaymentSheet,
  useStripe,
  StripeProvider,
  CardField,
};