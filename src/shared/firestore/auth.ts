import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import type { AuthApi } from "../store/types";
import { auth } from "./firebase";

/** Firebase Auth needs an email; the login form asks for a plain username. */
const USERNAME_EMAIL_DOMAIN = "scoreboard.local";

function toEmail(username: string): string {
  const trimmed = username.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : `${trimmed}@${USERNAME_EMAIL_DOMAIN}`;
}

// Firebase Auth keeps the session in IndexedDB, so a signed-in operator stays signed in
// offline. Signing in for the first time needs a connection.
export const authApi: AuthApi = {
  subscribe(onChange) {
    return onAuthStateChanged(auth, (user) =>
      onChange(user ? { id: user.uid, label: user.email?.replace(`@${USERNAME_EMAIL_DOMAIN}`, "") ?? user.uid } : null),
    );
  },

  async signIn(username, password) {
    await signInWithEmailAndPassword(auth, toEmail(username), password);
  },

  signOut: () => signOut(auth),

  describeError(err) {
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
  },
};
