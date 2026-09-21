import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut, type User } from "firebase/auth";
import { auth } from "./firebase";

/** Firebase Auth needs an email; the login form asks for a plain username. */
const USERNAME_EMAIL_DOMAIN = "scoreboard.local";

function toEmail(username: string): string {
  const trimmed = username.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : `${trimmed}@${USERNAME_EMAIL_DOMAIN}`;
}

export async function signIn(username: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, toEmail(username), password);
}

export function signOut(): Promise<void> {
  return fbSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function describeAuthError(err: unknown): string {
  const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Wrong username or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return "Could not sign in.";
  }
}
