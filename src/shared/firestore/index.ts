import { onSnapshot } from "firebase/firestore";
import type { DataStore, SyncApi } from "../store/types";
import { authApi } from "./auth";
import { matchApi } from "./matchRepo";
import { playersApi } from "./playerRepo";
import { scenesApi } from "./sceneRepo";
import { teamsApi } from "./teamRepo";
import { liveMatchRef, logSubscriptionError } from "./workspace";

/**
 * Read from the live match doc's metadata: `fromCache` means the server hasn't confirmed
 * it (offline or still connecting); pending writes are the operator's unsent match changes,
 * the ones that matter on air.
 */
const syncApi: SyncApi = {
  subscribe(onChange) {
    return onSnapshot(
      liveMatchRef(),
      { includeMetadataChanges: true },
      (snap) => onChange({ connected: !snap.metadata.fromCache, pendingWrites: snap.metadata.hasPendingWrites }),
      logSubscriptionError("Sync status"),
    );
  },
};

export const firestoreStore: DataStore = {
  kind: "firestore",
  auth: authApi,
  match: matchApi,
  teams: teamsApi,
  players: playersApi,
  scenes: scenesApi,
  sync: syncApi,
};
