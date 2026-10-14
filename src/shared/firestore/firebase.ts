import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

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

export const app = initializeApp(firebaseConfig);
// Persistent cache (IndexedDB): pages load the last known state without a connection,
// and writes made offline are queued and sent on reconnect. Multi-tab, because the
// control page embeds output previews from the same origin.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const auth = getAuth(app);

if (import.meta.env.VITE_USE_EMULATORS === "true") {
  // Ports match firebase.json; override to run a second local stack side by side.
  const firestorePort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT ?? 8080);
  const authPort = Number(import.meta.env.VITE_AUTH_EMULATOR_PORT ?? 9099);
  connectFirestoreEmulator(db, "127.0.0.1", firestorePort);
  connectAuthEmulator(auth, `http://127.0.0.1:${authPort}`, { disableWarnings: true });
}
