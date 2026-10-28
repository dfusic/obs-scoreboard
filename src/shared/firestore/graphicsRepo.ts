import { onSnapshot } from "firebase/firestore";
import { normalizeGraphics } from "../normalize";
import type { GraphicsApi } from "../store/types";
import type { GraphicsSettings } from "../types";
import { graphicsRef, logSubscriptionError } from "./workspace";

/** Read-only: the look changes on air only through `graphicsDraft.publish` (graphicsDraftRepo.ts). */
export const graphicsApi: GraphicsApi = {
  subscribe(onChange) {
    return onSnapshot(
      graphicsRef(),
      (snap) => onChange(normalizeGraphics(snap.data() as Partial<GraphicsSettings> | undefined)),
      logSubscriptionError("Graphics"),
    );
  },
};
