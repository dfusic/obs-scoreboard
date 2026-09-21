import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// These values are client identifiers, not secrets — safe to commit.
// Access control comes from Firebase Auth + firestore.rules (writes require sign-in).
const firebaseConfig = {
  apiKey: "AIzaSyCcOfdh66iQWvoWARsKoh2ttVhzW10zQyE",
  authDomain: "granicar-scoreboard.firebaseapp.com",
  projectId: "granicar-scoreboard",
  storageBucket: "granicar-scoreboard.firebasestorage.app",
  messagingSenderId: "709531084356",
  appId: "1:709531084356:web:d06aa533d6aad91d70be11",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
