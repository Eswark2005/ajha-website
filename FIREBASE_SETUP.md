# Firebase Backend & Email Notification Setup Guide

This guide walks you through setting up the Firebase backend for **AJHA Consultancy Services** ([ajha-website](file:///C:/Users/sanka/.gemini/antigravity/scratch/ajha-website)).

---

## 🏗️ Architecture Overview

When a visitor submits the "Contact Us" form:
1. **Frontend**: Validates input and saves a new document directly into the Google Cloud Firestore `contacts` collection.
2. **Database**: Cloud Firestore securely stores the record with a timestamp, sender details, subject, and message.
3. **Cloud Function**: `sendContactEmail` is triggered automatically upon document creation.
4. **Email Dispatch**: A formatted branded email notification is sent via Nodemailer to **`ram.annadanam@gmail.com`**.
5. **Status Update**: The function marks the Firestore document with `emailStatus: "sent"` and the delivery timestamp.

---

## 📋 Prerequisites

- A [Google Account](https://accounts.google.com)
- [Node.js](https://nodejs.org/) installed on your machine (v18 or higher recommended)
- [Firebase CLI](https://firebase.google.com/docs/cli):
  ```bash
  npm install -g firebase-tools
  ```

---

## 🚀 Step-by-Step Setup

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **"Add project"** (or **"Create a project"**).
3. Enter a project name (e.g., `ajha-consultancy-web`).
4. (Optional) Enable Google Analytics and click **"Create project"**.

---

### Step 2: Enable Cloud Firestore Database
1. In the left navigation menu, go to **Build** → **Firestore Database**.
2. Click **"Create database"**.
3. Choose a database location close to your users (e.g., `asia-south1` for Mumbai, or `us-central1`).
4. Select **Start in production mode** (our `firestore.rules` will configure the permissions).
5. Click **"Enable"**.

---

### Step 3: Register Web App & Get Web SDK Keys
1. In the Firebase Console, click the gear icon ⚙️ next to **Project Overview** → **Project settings**.
2. Under the **General** tab, scroll down to **"Your apps"** and click the Web icon (`</>`).
3. App nickname: `AJHA Website` (Hosting checkbox is optional).
4. Click **"Register app"**.
5. Firebase will display your `firebaseConfig` object, looking like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "ajha-consultancy-web.firebaseapp.com",
     projectId: "ajha-consultancy-web",
     storageBucket: "ajha-consultancy-web.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef..."
   };
   ```
6. Open [`firebase-config.js`](file:///C:/Users/sanka/.gemini/antigravity/scratch/ajha-website/firebase-config.js) in your project and replace the placeholder values with your real credentials:
   ```javascript
   export const firebaseConfig = {
     apiKey: "YOUR_ACTUAL_API_KEY",
     authDomain: "YOUR_ACTUAL_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_ACTUAL_PROJECT_ID",
     storageBucket: "YOUR_ACTUAL_PROJECT_ID.firebasestorage.app",
     messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID",
     appId: "YOUR_ACTUAL_APP_ID"
   };
   ```

---

### Step 4: Configure Email Dispatch Credentials
The Cloud Function in `functions/index.js` uses **Nodemailer** to send emails to `ram.annadanam@gmail.com`.

1. Navigate to the `functions` directory:
   ```bash
   cd functions
   npm install
   ```

2. Create your `.env` file from the provided `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Configure your SMTP settings in `functions/.env`:

   #### Option A: Gmail with App Password (Recommended & Easiest)
   1. In your Google account (e.g., company Gmail or your sender account), turn on **2-Step Verification** under [Google Account Security](https://myaccount.google.com/security).
   2. Navigate to [App Passwords](https://myaccount.google.com/apppasswords).
   3. Create a new app password:
      - App name: `AJHA Website Contact Form`
   4. Copy the generated 16-character password.
   5. In `functions/.env`, set:
      ```env
      TO_EMAIL=ram.annadanam@gmail.com
      FROM_EMAIL="AJHA Website" <your-email@gmail.com>
      SMTP_SERVICE=gmail
      SMTP_USER=your-email@gmail.com
      SMTP_PASS=your-16-character-app-password
      ```

   #### Option B: Professional SMTP Provider (SendGrid, Brevo, AWS SES, Resend)
   If you use an SMTP service provider, specify the host and API key:
   ```env
   TO_EMAIL=ram.annadanam@gmail.com
   FROM_EMAIL="AJHA Website" <contact@ajhaconsultancy.com>
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=YOUR_SENDGRID_OR_BREVO_API_KEY
   ```

---

### Step 5: Deploy to Firebase

1. Log in to Firebase via CLI (run in project root `ajha-website`):
   ```bash
   firebase login
   ```

2. Link your local directory to your Firebase project:
   ```bash
   firebase use --add
   ```
   Select your newly created Firebase project from the list.

3. Deploy Firestore Security Rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

4. Deploy Cloud Functions:
   > **Note**: Cloud Functions requires upgrading your Firebase project to the **Blaze Plan** (pay-as-you-go). The Blaze plan offers a free tier of **2,000,000 function invocations per month**, so standard website contact traffic incurs $0.00.
   ```bash
   firebase deploy --only functions
   ```

5. (Optional) Deploy Website to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

---

## 🧪 Testing & Verification

1. **Open the Website**:
   Open `index.html` locally in a browser or serve it using any local static server (e.g., `npx serve .` or VS Code Live Server).
2. **Submit an Inquiry**:
   Scroll down to the **"We would love to hear from you"** section.
   - Enter a Name, Email, Subject, and Message.
   - Click **"Send Message"**.
   - You should see the button display a spinning loader, followed by a green success banner:
     > *"Thank you! Your message has been sent successfully. We will be in touch shortly."*
3. **Verify in Firebase Console**:
   - Go to [Firebase Console](https://console.firebase.google.com/) → **Firestore Database**.
   - You will see a `contacts` collection containing your newly created inquiry document.
   - Check the fields: `name`, `email`, `subject`, `message`, `recipient`, `createdAt`, `emailStatus: "sent"`.
4. **Verify Email**:
   - Check the inbox for **`ram.annadanam@gmail.com`**.
   - You should find a formatted, branded HTML email with all inquiry details and a direct "Reply" button.

---

## 🔒 Security Rules Summary

The [`firestore.rules`](file:///C:/Users/sanka/.gemini/antigravity/scratch/ajha-website/firestore.rules) file enforces strict security:
- **Public Write with Validation**: Any website visitor can write a document to `contacts`, provided `name`, `email`, and `message` are non-empty strings within safe length limits.
- **Private Read/Edit/Delete**: Only authenticated users (admins) can view, edit, or delete submitted inquiries. Public visitors cannot read any contact submissions.
- **Backend Admin Access**: Firebase Cloud Functions uses `firebase-admin` with privileged access to read data and send notification emails.
