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

function normalizeAmountValue(input) {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : NaN;
  }

  if (typeof input === "string") {
    const cleaned = input.replace(/[^0-9.-]/g, "");
    if (!cleaned) return NaN;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  return NaN;
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

// Stripe SetupIntent client_secret format: "seti_XXXX_secret_YYYY"
function extractSetupIntentIdFromClientSecret(clientSecret) {
  if (!clientSecret || typeof clientSecret !== "string") return null;
  const idx = clientSecret.indexOf("_secret_");
  if (idx <= 0) return null;
  return clientSecret.slice(0, idx); // "seti_XXXX"
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
    accountId: data?.accountId || data?.account || data?.stripeAccountId || null,
    onboardingUrl:
      data?.onboardingUrl || data?.accountLinkUrl || data?.url || null,
  };
}

// ✅ Barber finalize (already exists)
async function finalizeBarberSubscription({
  userId,
  customerEmail,
  setupIntentId,
  priceId,
}) {
  const BACKEND_URL = getBackendUrl();
  if (!BACKEND_URL) throw new Error("Backend not configured");

  const headers = await getAuthHeaders();
  const url = `${BACKEND_URL}/api/finalize-barber-subscription${
    VERCEL_BYPASS ? `?x-vercel-protection-bypass=${VERCEL_BYPASS}` : ""
  }`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      userId,
      customerEmail,
      setupIntentId,
      ...(priceId ? { priceId } : {}),
    }),
  });

  const { data, raw } = await parseResponsePayload(response);
  if (!response.ok) {
    throw new Error(
      resolveBackendErrorMessage(data, raw, "Failed to finalize subscription")
    );
  }

  return data;
}

// ✅ NEW: finalize CUSTOMER setup (attach + set default + write Firestore)
async function finalizeCustomerSetup({ setupIntentId }) {
  const BACKEND_URL = getBackendUrl();
  if (!BACKEND_URL) throw new Error("Backend not configured");

  const headers = await getAuthHeaders();
  const url = `${BACKEND_URL}/api/finalize-customer-setup${
    VERCEL_BYPASS ? `?x-vercel-protection-bypass=${VERCEL_BYPASS}` : ""
  }`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ setupIntentId }),
  });

  const { data, raw } = await parseResponsePayload(response);
  if (!response.ok) {
    throw new Error(
      resolveBackendErrorMessage(data, raw, "Failed to finalize customer setup")
    );
  }

  return data;
}

/* =========================================================
   INITIALIZE STRIPE
========================================================= */
export const initializeStripe = async () => {
  await initStripe({
    publishableKey: STRIPE_PUBLISHABLE_KEY,
    merchantIdentifier: "merchant.com.barberapp",
    urlScheme: "barberclean",
  });
};

/* =========================================================
   SERVICE PAYMENT
========================================================= */

export const createAndPresentServicePaymentSheet = async (
  stripeHook,
  appointmentId,
  description = "Barber Service"
) => {
  const { initPaymentSheet, presentPaymentSheet } = stripeHook;

  const BACKEND_URL = getBackendUrl();
  if (!BACKEND_URL) throw new Error("Backend not configured");

  const headers = await getAuthHeaders();

  const url = `${BACKEND_URL}/api/create-payment-intent${
    VERCEL_BYPASS ? `?x-vercel-protection-bypass=${VERCEL_BYPASS}` : ""
  }`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ appointmentId }),
  });

  const { data, raw } = await parseResponsePayload(response);

  if (!response.ok) {
    throw new Error(
      resolveBackendErrorMessage(data, raw, "Failed to create payment intent")
    );
  }

  const paymentIntentClientSecret =
    data?.paymentIntent ||
    data?.paymentIntentClientSecret ||
    data?.clientSecret ||
    null;

  if (!paymentIntentClientSecret) {
    throw new Error("Backend response missing PaymentIntent client secret.");
  }

  const customerId = data?.customer || data?.customerId || null;
  const customerEphemeralKeySecret =
    data?.ephemeralKey || data?.ephemeralKeySecret || null;

  const paymentSheetConfig = {
    merchantDisplayName: "ScheduleSync AI",
    paymentIntentClientSecret,
    allowsDelayedPaymentMethods: false,
    returnURL: "barberclean://payment-return",

    // 🔒 DISABLE LINK (optional; dashboard setting is the real control)
    linkDisplay: "never",
  };

  if (customerId && customerEphemeralKeySecret) {
    paymentSheetConfig.customerId = customerId;
    paymentSheetConfig.customerEphemeralKeySecret = customerEphemeralKeySecret;
  }

  const { error: initError } = await initPaymentSheet(paymentSheetConfig);
  if (initError) throw new Error(initError.message);

  const { error: presentError } = await presentPaymentSheet();

  if (presentError) {
    if (presentError.code === "Canceled") {
      return { success: false, canceled: true };
    }
    throw new Error(presentError.message);
  }

  return { success: true };
};

/* =========================================================
   TIP PAYMENT
========================================================= */

export const createTipPaymentSheet = async (
  userId,
  tipAmount,
  appointmentId = null,
  barberId = null
) => {
  const BACKEND_URL = getBackendUrl();
  if (!BACKEND_URL) throw new Error("Backend not configured");
  const headers = await getAuthHeaders();

  const parsedAmount = normalizeAmountValue(tipAmount);
  const parsedAmountCents = Math.round(parsedAmount * 100);
  if (
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0 ||
    !Number.isFinite(parsedAmountCents) ||
    parsedAmountCents <= 0
  ) {
    throw new Error("Invalid tip amount");
  }

  const basePayload = {
    userId,
    appointmentId,
    ...(barberId ? { barberId } : {}),
  };

  const payloadVariants = [
    { ...basePayload, amount: parsedAmount },
    { ...basePayload, amountCents: parsedAmountCents },
    { ...basePayload, tipAmount: parsedAmount },
    { ...basePayload, tipAmountCents: parsedAmountCents },
    {
      ...basePayload,
      amount: parsedAmount,
      amountCents: parsedAmountCents,
      tipAmount: parsedAmount,
      tipAmountCents: parsedAmountCents,
    },
  ];
  const endpointPaths = ["/api/create-tip-payment-intent", "/api/create-tip-intent"];

  let lastError = "Failed to create tip payment intent";
  let sawTipValidationError = false;

  for (const path of endpointPaths) {
    for (const body of payloadVariants) {
      const url = `${BACKEND_URL}${path}${
        VERCEL_BYPASS ? `?x-vercel-protection-bypass=${VERCEL_BYPASS}` : ""
      }`;

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const { data, raw } = await parseResponsePayload(response);

      if (!response.ok) {
        const errorMessage = resolveBackendErrorMessage(data, raw, lastError);
        lastError = errorMessage;

        if (response.status === 404) continue;

        if (/invalid tip amount/i.test(errorMessage)) {
          sawTipValidationError = true;
          continue;
        }

        throw new Error(errorMessage);
      }

      const clientSecret =
        data?.paymentIntentClientSecret ||
        data?.clientSecret ||
        data?.paymentIntent ||
        null;
      const customer = data?.customerId || data?.customer || null;
      const ephemeralKey = data?.ephemeralKeySecret || data?.ephemeralKey || null;
      const paymentIntentId =
        data?.paymentIntentId || data?.id || data?.paymentIntentID || null;

      if (!clientSecret) {
        throw new Error("Backend response missing PaymentIntent client secret.");
      }

      return { clientSecret, customer, ephemeralKey, paymentIntentId };
    }
  }

  if (sawTipValidationError) {
    throw new Error(
      "Tip amount was rejected by the backend. Verify tip endpoint expects dollars vs cents and tip field names."
    );
  }

  throw new Error(
    `${lastError}. Tip payments require a tip-specific backend endpoint (/api/create-tip-payment-intent).`
  );
};

/* =========================================================
   CARD SETUP (SAVE DEFAULT PAYMENT METHOD)
========================================================= */

export const presentSetupIntentSheet = async (
  stripeHook,
  { customerId, customerName, customerEmail } = {}
) => {
  const { initPaymentSheet, presentPaymentSheet } = stripeHook || {};
  if (!initPaymentSheet || !presentPaymentSheet) {
    throw new Error("Stripe is not ready");
  }

  const BACKEND_URL = getBackendUrl();
  if (!BACKEND_URL) throw new Error("Backend not configured");

  const headers = await getAuthHeaders();
  const url = `${BACKEND_URL}/api/create-customer-setup-intent${
    VERCEL_BYPASS ? `?x-vercel-protection-bypass=${VERCEL_BYPASS}` : ""
  }`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerId,
      customerName,
      customerEmail,
    }),
  });

  const { data, raw } = await parseResponsePayload(response);
  if (!response.ok) {
    return {
      success: false,
      error: {
        message: resolveBackendErrorMessage(
          data,
          raw,
          "Failed to create setup intent"
        ),
        code: data?.code || "setup_intent_create_failed",
      },
    };
  }

  const setupIntentClientSecret =
    data?.setupIntentClientSecret || data?.clientSecret || data?.setupIntent || null;

  const sheetCustomerId = data?.customerId || data?.customer || null;
  const customerEphemeralKeySecret =
    data?.ephemeralKeySecret || data?.ephemeralKey || null;

  if (!setupIntentClientSecret) {
    return {
      success: false,
      error: { message: "Backend response missing SetupIntent client secret." },
    };
  }

  const paymentSheetConfig = {
    merchantDisplayName: "ScheduleSync AI",
    setupIntentClientSecret,
    allowsDelayedPaymentMethods: false,
    returnURL: "barberclean://payment-return",

    // 🔒 DISABLE LINK (optional; dashboard setting is the real control)
    linkDisplay: "never",
  };

  if (sheetCustomerId && customerEphemeralKeySecret) {
    paymentSheetConfig.customerId = sheetCustomerId;
    paymentSheetConfig.customerEphemeralKeySecret = customerEphemeralKeySecret;
  }

  const { error: initError } = await initPaymentSheet(paymentSheetConfig);
  if (initError) return { success: false, error: initError };

  const { error: presentError } = await presentPaymentSheet();
  if (presentError) {
    if (presentError.code === "Canceled") {
      return { success: false, canceled: true };
    }
    return { success: false, error: presentError };
  }

  const setupIntentId =
    data?.setupIntentId ||
    data?.id ||
    extractSetupIntentIdFromClientSecret(setupIntentClientSecret);

  // ✅ NEW: finalize customer setup so Firestore gets defaultPaymentMethodId
  try {
    if (setupIntentId) {
      await finalizeCustomerSetup({ setupIntentId });
    }
  } catch (e) {
    return {
      success: false,
      error: { message: e?.message || "Failed to finalize customer setup" },
    };
  }

  return {
    success: true,
    setupIntentClientSecret,
    setupIntentId,
    customerId: sheetCustomerId,
  };
};

/* =========================================================
   BARBER SUBSCRIPTION (FIXED FLOW)
========================================================= */

export const createSubscriptionPaymentSheet = async (
  stripeHook,
  userId,
  priceId,
  customerEmail
) => {
  if (!userId) throw new Error("Missing userId");
  if (!customerEmail) throw new Error("Missing customerEmail");

  const setupResult = await presentSetupIntentSheet(stripeHook, {
    customerEmail,
  });

  if (!setupResult?.success) return setupResult;

  const setupIntentId =
    setupResult?.setupIntentId ||
    extractSetupIntentIdFromClientSecret(setupResult?.setupIntentClientSecret);

  if (!setupIntentId) {
    return {
      success: false,
      error: { message: "Could not determine SetupIntent ID after card setup." },
    };
  }

  let finalizeResult;
  try {
    finalizeResult = await finalizeBarberSubscription({
      userId,
      customerEmail,
      setupIntentId,
      priceId,
    });
  } catch (e) {
    return {
      success: false,
      error: { message: e?.message || "Failed to finalize subscription" },
    };
  }

  const connect = await createConnectAccount({
    userId,
    email: customerEmail,
  });

  return {
    success: true,
    ...setupResult,
    finalize: finalizeResult,
    subscriptionId:
      finalizeResult?.subscriptionId || finalizeResult?.subscriptionID || null,
    subscriptionStatus: finalizeResult?.status || null,
    connectAccountId: connect.accountId,
    onboardingUrl: connect.onboardingUrl,
  };
};

export { useStripe, StripeProvider, CardField };

export default {
  initializeStripe,
  createAndPresentServicePaymentSheet,
  createTipPaymentSheet,
  presentSetupIntentSheet,
  createSubscriptionPaymentSheet,
  useStripe,
  StripeProvider,
  CardField,
};