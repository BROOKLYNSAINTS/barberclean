# SpinUp Solutions Trail Project

This is a **trail project** for SpinUp Solutions, designed to demonstrate phone authentication with Firebase, strong backend logic, and state persistence in a React Native (Expo) app.  

> ⚠️ This project focuses on **backend efficiency and reliability** rather than UI/UX design, as it is meant to serve as a foundation for a larger production project.

---

## Table of Contents

- [Project Overview](#project-overview)  
- [Features](#features)  
- [Setup Instructions](#setup-instructions)  
- [Testing OTP Numbers](#testing-otp-numbers)  
- [Why no new numbers can be added](#why-no-new-numbers-can-be-added)  
- [Notes](#notes)  

---

## Project Overview

This app demonstrates:

- **Phone number authentication** using Firebase Auth.  
- **OTP verification** with app-friendly error handling.  
- **Firestore integration** to store and update user information.  
- **State persistence** using AsyncStorage, allowing the user to stay logged in even after closing the app.  

---

## Features

- Login via phone number and OTP.  
- Verification of OTP with proper app-friendly messages.  
- Storing user data in **Firestore** production database.  
- Persistent authentication state using **AsyncStorage**.  
- Logout functionality with user data cleared from storage.  
- Quick setup to test backend functionality.  

---

## Setup Instructions

Follow these steps to run the app locally:

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/spinup-trail.git
cd spinup-trail
```

2. **Install Dependencies**

```bash
npm install
```

3. **Start the Expo server**

```bash
npx expo start
```



## Testing OTP Numbers

For this trail project, predefined test numbers are used. Only these numbers will work:

Phone Number	OTP
+923167610403	123123
+923013175983	123456

✅ You can add more test numbers by going to Firebase Console → Authentication → Sign-in Method → Phone numbers for testing.

Important Note on Phone Numbers for OTP Testing

Currently, the app uses Firebase Phone Authentication in production mode, which requires a paid Firebase plan to send OTPs to new numbers.

✅ That’s why new phone numbers cannot be added for testing unless you upgrade your Firebase project.



## Notes for the Chris Ozgo

This is a trail project, focused on time efficiency and a strong backend foundation.

UI/UX design is minimal and not the main priority.

The backend uses production Firestore database, so all data stored is live in the production environment.

OTP handling is secure and efficient, with app-friendly error messages for invalid codes or multiple attempts.

This project serves as a solid base for the full-scale SpinUp Solutions project. Once approved, additional features and UI improvements can be added to scale it up quickly.
