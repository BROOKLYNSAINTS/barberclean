# Payment Routing to Barbers - Setup Guide

## ✅ What I Just Fixed

### 1. Created `/api/create-payment-intent.js` locally
This endpoint now:
- Accepts `barberId` from the frontend
- Fetches the barber's `stripeConnectAccountId` from Firestore
- Creates a PaymentIntent with `transfer_data.destination` to route money to the barber
- Optionally can take a platform fee (currently commented out)

### 2. Updated Frontend (`src/services/stripe.js`)
- Modified `createPaymentIntent()` to accept and pass `barberId`
- Modified `createAndPresentServicePaymentSheet()` to pass `barberId` when creating payments

## 🔍 How the Payment Flow Works Now

### When a Customer Pays a Barber:
1. Customer initiates payment through the app
2. Frontend calls `createAndPresentServicePaymentSheet(stripe, userId, barberId, appointmentId, amount, ...)`
3. This calls your backend `/api/create-payment-intent` with `barberId`
4. Backend fetches barber's `stripeConnectAccountId` from Firestore
5. Backend creates PaymentIntent with:
   ```javascript
   {
     amount: 5000, // $50 in cents
     transfer_data: {
       destination: 'acct_xxx' // Barber's Connect account
     }
   }
   ```
6. Customer pays
7. **Money automatically goes to the barber's bank account** ✅

## 📋 What You Need to Do

### Step 1: Compare Backend Files
You have these in your backend:
- `create-payment-intent-existing.js`
- `create-payment-intent.js`
- `test-payment-intent.js`

**Check if your backend's `create-payment-intent.js` includes:**
```javascript
// Does it accept barberId?
const { barberId } = req.body;

// Does it fetch barber's Connect account?
const barberDoc = await db.collection('users').doc(barberId).get();
const stripeConnectAccountId = barberDoc.data().stripeConnectAccountId;

// Does it route payment to barber?
transfer_data: {
  destination: stripeConnectAccountId
}
```

### Step 2: If Your Backend Doesn't Have This
Either:
- **Option A**: Copy the logic from `/api/create-payment-intent.js` (the one I just created locally) to your backend
- **Option B**: Deploy the local `/api/create-payment-intent.js` to Vercel/your backend platform

### Step 3: Test the Flow
1. Create a test barber account
2. Subscribe as a barber (this creates the Connect account and stores `stripeConnectAccountId` in Firestore)
3. Complete Stripe Connect onboarding (bank account setup)
4. Create a test customer account
5. Book an appointment
6. Make a payment
7. Check in Stripe Dashboard:
   - Go to Payments → Should see the payment
   - Go to Connect → Connected Accounts → Find the barber
   - Should see the transfer to the barber's account

## 🎯 Key Points

### For Barbers to Receive Payments:
1. ✅ Barber must have an active subscription ($30/month)
2. ✅ Barber must complete Stripe Connect onboarding (happens after subscription)
3. ✅ Barber's `stripeConnectAccountId` must be stored in Firestore
4. ✅ Customer payments must include `barberId` in the request
5. ✅ Backend must use `transfer_data.destination` when creating PaymentIntent

### Current Status:
- ✅ Barber subscription flow is set up
- ✅ Connect account creation is integrated (`create-connect-account`)
- ✅ Frontend now passes `barberId` when creating payments
- ⚠️ **Need to verify backend routes payments to barber's Connect account**

## 💰 Optional: Platform Fee
If you want to take a commission (e.g., 10% of each transaction), uncomment this in the API:
```javascript
// Take 10% platform fee
applicationFeeAmount = Math.round(amount * 100 * 0.10);

// Then add to PaymentIntent:
{
  transfer_data: {
    destination: stripeConnectAccountId,
  },
  application_fee_amount: applicationFeeAmount // Your commission
}
```

## 🐛 Debugging
Check console logs when a customer pays:
- `🔧 Barber ID: bar_xxx` - Frontend is passing barberId
- `📋 Barber xxx Connect Account: acct_xxx` - Backend found the Connect account
- `✅ Payment will be transferred to Connect account: acct_xxx` - Payment is routed

If you see `⚠️ No Connect account found`, the barber:
- Hasn't subscribed yet, OR
- Hasn't had their Connect account created, OR
- Their Connect account ID isn't stored in Firestore

## 📚 Stripe Connect Resources
- [Destination Charges](https://stripe.com/docs/connect/destination-charges)
- [Testing Connect](https://stripe.com/docs/connect/testing)
