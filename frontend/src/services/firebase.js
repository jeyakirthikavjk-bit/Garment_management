// Firebase Configuration & Google Authentication Service
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Standard Firebase App Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD-DemoKeyForThreadLineSystem123",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "threadline-garment-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "threadline-garment-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "threadline-garment-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1082260655848",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1082260655848:web:a89f8d9f10928a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Enable account selection prompt so user can pick any Gmail account
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Triggers official Firebase Google Sign-In Popup (accounts.google.com)
 */
export async function signInWithGooglePopup() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return {
      email: user.email,
      name: user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL,
      uid: user.uid
    };
  } catch (error) {
    console.error('Firebase Google Auth Error:', error);
    throw error;
  }
}
