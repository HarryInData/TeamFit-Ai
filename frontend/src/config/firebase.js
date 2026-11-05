/**
 * ═══════════════════════════════════════════
 * FIREBASE CONFIG — TeamFit AI
 * Initializes Firebase App + Auth with Google
 * provider. Reads config from VITE_ env vars.
 * ═══════════════════════════════════════════
 */

import { initializeApp } from "@firebase/app";
import { getAuth, GoogleAuthProvider } from "@firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(
  (value) => typeof value === 'string' && value.trim().length > 0,
);

let auth = null;
let googleProvider = null;

if (hasFirebaseConfig) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    // Always prompt user to select an account (don't auto-pick)
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (error) {
    console.error('Firebase Auth is unavailable; email/password sign-in remains enabled.', error);
  }
}

export { auth, googleProvider };
