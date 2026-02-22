# Stripe Connect Return URL Fix

## Problem
Stripe Connect onboarding was completing successfully, but not redirecting back to the mobile app.

## Root Cause
1. **URL Scheme Mismatch**: The app was initialized with `barberapp://` but the actual scheme in `app.config.js` is `barberclean://`
2. **Backend Redirect Issue**: The backend `/api/connect-return` endpoint was trying to redirect to a web URL instead of a mobile deep link
3. **Missing Deep Link Handler**: The app had no listener to handle the Stripe Connect return deep link

## Solution Applied

### 1. Fixed URL Scheme (✅ DONE)
Updated [src/services/stripe.js](src/services/stripe.js):
- Changed `urlScheme: 'barberapp'` to `urlScheme: 'barberclean'`
- Updated payment return URLs from `barberapp://` to `barberclean://`

### 2. Added Deep Link Handler (✅ DONE)
Updated [app/_layout.js](app/_layout.js):
- Added deep link listener for Stripe Connect returns
- Updates Firestore when user completes Connect onboarding
- Redirects user to dashboard after completion

### 3. Backend Changes Required (⚠️ ACTION NEEDED)

Your backend `/api/connect-return` endpoint needs to be updated to redirect to the mobile app using the correct deep link format.

#### Current Backend Issue
The backend is logging:
```
✅ Stripe Connect onboarding completed, redirecting user...
```

But it's likely redirecting to a web URL or using the wrong scheme.

#### Required Backend Changes

**Location**: `barber-backend/api/connect-return.js` (or similar)

**Current Code** (probably something like):
```javascript
export default async function handler(req, res) {
  // ... verify Stripe account completion ...
  
  // ❌ This won't work for mobile:
  return res.redirect('https://your-app.com/dashboard');
  // or
  return res.redirect('barberapp://connect-return'); // Wrong scheme
}
```

**Updated Code** (what it should be):
```javascript
export default async function handler(req, res) {
  const { account } = req.query;
  
  try {
    console.log('✅ Stripe Connect onboarding completed for account:', account);
    
    // Verify the account with Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const stripeAccount = await stripe.accounts.retrieve(account);
    
    // Check if charges are enabled (onboarding complete)
    if (stripeAccount.charges_enabled) {
      console.log('✅ Account charges enabled, onboarding complete');
      
      // Update Firestore with onboarding completion
      const admin = require('firebase-admin');
      // Find user by stripeConnectAccountId and update
      const usersRef = admin.firestore().collection('users');
      const snapshot = await usersRef.where('stripeConnectAccountId', '==', account).get();
      
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        await userDoc.ref.update({
          stripeConnectOnboardingComplete: true,
          stripeConnectChargesEnabled: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Updated user Firestore document');
      }
    }
    
    // ✅ Redirect to mobile app using correct deep link
    // For iOS and Android, use the mobile app scheme
    return res.redirect('barberclean://connect-return?success=true');
    
  } catch (error) {
    console.error('❌ Error handling connect return:', error);
    return res.redirect('barberclean://connect-return?success=false&error=' + encodeURIComponent(error.message));
  }
}
```

#### Alternative: Platform Detection
If you want to support both web and mobile:

```javascript
export default async function handler(req, res) {
  const { account } = req.query;
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
  
  try {
    // ... handle Stripe account verification ...
    
    if (isMobile) {
      // Mobile app deep link
      return res.redirect('barberclean://connect-return?success=true');
    } else {
      // Web redirect
      return res.redirect('https://your-web-app.com/dashboard?connectComplete=true');
    }
  } catch (error) {
    console.error('Error:', error);
    if (isMobile) {
      return res.redirect('barberclean://connect-return?success=false');
    } else {
      return res.redirect('https://your-web-app.com/error');
    }
  }
}
```

### 4. Backend Create Connect Account (⚠️ CHECK THIS)

**Location**: `barber-backend/api/create-connect-account.js`

When creating the Account Link, ensure the `refresh_url` and `return_url` are set correctly:

```javascript
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${YOUR_BACKEND_URL}/api/connect-refresh?account=${account.id}`,
  return_url: `${YOUR_BACKEND_URL}/api/connect-return?account=${account.id}`,
  type: 'account_onboarding',
});
```

The `return_url` should point to your backend endpoint, which then redirects to the mobile app.

## Testing the Fix

### 1. Test Deep Link Locally
In the app:
```javascript
import { Linking } from 'react-native';

// Test the deep link
Linking.openURL('barberclean://connect-return?success=true');
```

### 2. Test Full Flow
1. Create a new barber account
2. Start subscription (creates Connect account)
3. Complete Stripe Connect onboarding
4. After completion, should redirect back to app dashboard
5. Check Firestore: `stripeConnectOnboardingComplete` should be `true`

### 3. Check Logs
**Frontend logs:**
```
🔗 Deep link received: barberclean://connect-return?success=true
✅ Stripe Connect onboarding return detected
✅ Marked Connect onboarding as complete in Firestore
```

**Backend logs:**
```
✅ Stripe Connect onboarding completed for account: acct_xxx
✅ Account charges enabled, onboarding complete
✅ Updated user Firestore document
```

## URL Scheme Configuration Reference

**App Configuration** (`app.config.js`):
```javascript
{
  scheme: "barberclean",
  // ...
}
```

**Android Intent URL** (for Android deep links):
```
intent://connect-return?success=true#Intent;scheme=barberclean;package=com.ScheduleSync.barber.one;end
```

**iOS Universal Link** (alternative to URL scheme):
```
https://your-domain.com/connect-return
```
With proper configuration in `apple-app-site-association` file.

## Common Issues

### Issue: "Deep link not opening app"
- **Check**: Ensure app is installed
- **Check**: Verify scheme in `app.config.js` matches deep link
- **iOS**: May need to configure Associated Domains
- **Android**: May need to add intent filters in `AndroidManifest.xml`

### Issue: "App opens but nothing happens"
- **Check**: Look for deep link handler logs in app console
- **Check**: Verify Linking event listener is registered
- **Fix**: Make sure `app/_layout.js` changes are included in build

### Issue: "Backend returns 200 but doesn't redirect"
- **Check**: Backend must use `res.redirect()` not `res.json()`
- **Check**: Verify redirect URL format is correct
- **Test**: Use curl to check redirect header:
  ```bash
  curl -I "https://barber-backend-ten.vercel.app/api/connect-return?account=acct_xxx"
  ```

## Next Steps

1. ✅ Frontend changes are complete (already applied)
2. ⚠️ **Update backend `/api/connect-return` to redirect to `barberclean://connect-return`**
3. ⚠️ **Redeploy backend**
4. ✅ Test the complete flow
5. ✅ Verify Firestore updates correctly

## Files Modified

### Frontend (Already Updated)
- ✅ `src/services/stripe.js` - Fixed URL scheme
- ✅ `app/_layout.js` - Added deep link handler

### Backend (Needs Update)
- ⚠️ `api/connect-return.js` - Change redirect URL
- ⚠️ `api/create-connect-account.js` - Verify return_url (optional)
