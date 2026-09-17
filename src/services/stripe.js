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

function getBackendUrl() {
  return extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;
}

function buildBackendUrl(pathname) {
  const base = getBackendUrl();
  if (!base) throw new Error("Backend not configured");
  return `${base}${pathname}`;
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

export const initializeStripe = async () => {
  await initStripe({
    publishableKey: STRIPE_PUBLISHABLE_KEY,
    merchantIdentifier: "merchant.com.barberapp",
    urlScheme: "barberclean",
  });
};

/* =========================================================
   SETUP INTENT (CARD SAVE)
========================================================= */
export const presentSetupIntentSheet = async (stripe, params) => {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(
      buildBackendUrl("/api/create-customer-setup-intent"),
      {
        method: "POST",
        headers,
        body: JSON.stringify(params),
      }
    );

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("❌ RAW SETUP RESPONSE:", raw);
      throw new Error(raw || "Invalid server response");
    }

    if (!response.ok) {
      throw new Error(data?.error || "SetupIntent failed");
    }

    const init = await stripe.initPaymentSheet({
      merchantDisplayName: "ScheduleSync",
      customerId: data.customerId,
      customerEphemeralKeySecret: data.ephemeralKey,
      setupIntentClientSecret: data.clientSecret,
    });

    if (init.error) throw new Error(init.error.message);

    const present = await stripe.presentPaymentSheet();

    if (present.error) {
      if (present.error.code === "Canceled") {
        return { success: false, canceled: true };
      }
      throw new Error(present.error.message);
    }

    // SECOND CALL → set default payment method
    await fetch(buildBackendUrl("/api/create-customer-setup-intent"), {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });

    return {
      success: true,
      stripeCustomerId: data.customerId,
    };

  } catch (error) {
    console.error("SetupIntent error:", error);
    return { success: false, error };
  }
};

/* =========================================================
   SERVICE PAYMENT (FIXED JSON PARSE)
========================================================= */
export const createAndPresentServicePaymentSheet = async (
  stripe,
  { appointmentId, barberId, amount, serviceName }
) => {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(
      buildBackendUrl("/api/create-payment-intent"),
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          appointmentId,
          barberId,
          amount,
          type: "service",
          description: serviceName,

          metadata: {
            appointmentId,
            barberId,
            serviceName,
          },
        }),
      }
    );
    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("❌ RAW PAYMENT RESPONSE:", raw);
      throw new Error(raw || "Invalid server response");
    }

    if (!response.ok) {
      throw new Error(data?.error || "Payment failed");
    }

    const init = await stripe.initPaymentSheet({
      merchantDisplayName: "ScheduleSync",
      customerId: data.customerId,
      customerEphemeralKeySecret: data.ephemeralKey,
      paymentIntentClientSecret: data.clientSecret,

      // 🔥 REQUIRED FOR 3D TO RETURN TO APP
      returnURL: "barberclean://stripe-redirect",     
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
};export const createTipPaymentSheet = async (
  stripe,
  appointmentId,
  tipAmount
) => {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(
      buildBackendUrl("/api/create-tip-payment-intent"),
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          appointmentId,
          tipAmount,
        }),
      }
    );

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("❌ RAW TIP RESPONSE:", raw);
      throw new Error(raw || "Invalid server response");
    }

    if (!response.ok) {
      throw new Error(data?.error || "Tip payment failed");
    }

    const init = await stripe.initPaymentSheet({
      merchantDisplayName: "ScheduleSync",
      customerId: data.customerId,
      customerEphemeralKeySecret: data.ephemeralKey,
      paymentIntentClientSecret: data.clientSecret,

      // 🔥 REQUIRED FOR 3D RETURN
      returnURL: "barberclean://stripe-redirect",   
    
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
    console.error("Tip payment error:", error);
    return { success: false, error };
  }
};

export { useStripe, StripeProvider, CardField };

export default {
  initializeStripe,
  presentSetupIntentSheet,
  createAndPresentServicePaymentSheet,
  createTipPaymentSheet,
  useStripe,
  StripeProvider,
  CardField,
};
