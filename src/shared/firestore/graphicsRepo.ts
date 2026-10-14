import { onSnapshot, setDoc } from "firebase/firestore";
import { normalizeGraphics } from "../normalize";
import type { GraphicsApi } from "../store/types";
import type { GraphicsSettings } from "../types";
import { graphicsRef, logSubscriptionError } from "./workspace";

export const graphicsApi: GraphicsApi = {
  subscribe(onChange) {
    return onSnapshot(
      graphicsRef(),
      (snap) => onChange(normalizeGraphics(snap.data() as Partial<GraphicsSettings> | undefined)),
      logSubscriptionError("Graphics"),
    );
  },

  // Overwrites, so no colours from a previously saved template linger.
  async save(graphics) {
    await setDoc(graphicsRef(), graphics);
  },
};
