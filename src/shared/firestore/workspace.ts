import { collection, doc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Everything lives under workspaces/{WORKSPACE_ID}. There is one workspace for now;
 * multi-tenancy later means picking this id per signed-in customer.
 */
export const WORKSPACE_ID = "default";

const root = ["workspaces", WORKSPACE_ID] as const;

export const liveMatchRef = () => doc(db, ...root, "live", "match");
export const teamsCol = () => collection(db, ...root, "teams");
export const teamRef = (id: string) => doc(db, ...root, "teams", id);
export const playersCol = () => collection(db, ...root, "players");
export const playerRef = (id: string) => doc(db, ...root, "players", id);
export const scenesCol = () => collection(db, ...root, "scenes");
export const sceneRef = (type: string) => doc(db, ...root, "scenes", type);
export const graphicsRef = () => doc(db, ...root, "settings", "graphics");

/** onSnapshot error handler. A failed listener stops for good, so at least make it visible. */
export const logSubscriptionError = (what: string) => (err: Error) =>
  console.error(`${what} subscription failed (check firestore.rules are deployed):`, err);
