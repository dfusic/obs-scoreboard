import { firestoreStore } from "../firestore";
import type { DataStore } from "./types";

export type * from "./types";

/**
 * Picks the data backend for this page. Only Firestore exists today; the offline venue
 * mode will add a `local` store here (chosen by env or URL) without touching the UI.
 */
export function createStore(): DataStore {
  return firestoreStore;
}
