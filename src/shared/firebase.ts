import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

// Config comes from .env.<mode> (development = emulators, staging, production).
// These values are client identifiers, not secrets — safe to commit.
// Access control comes from Firebase Auth + firestore.rules (writes require sign-in).
function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) throw new Error(`Missing ${name}. Check .env.${import.meta.env.MODE}.`);
  return value;
}

const firebaseConfig = {
  apiKey: requireEnv("VITE_FIREBASE_API_KEY"),
  authDomain: requireEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: requireEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: requireEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requireEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requireEnv("VITE_FIREBASE_APP_ID"),
};

/** Vite mode: "development" (local emulators), "staging" or "production". */
export const APP_ENV = import.meta.env.MODE;

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

if (import.meta.env.VITE_USE_EMULATORS === "true") {
  // Ports match firebase.json; override to run a second local stack side by side.
  const firestorePort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT ?? 8080);
  const authPort = Number(import.meta.env.VITE_AUTH_EMULATOR_PORT ?? 9099);
  connectFirestoreEmulator(db, "127.0.0.1", firestorePort);
  connectAuthEmulator(auth, `http://127.0.0.1:${authPort}`, { disableWarnings: true });
}
