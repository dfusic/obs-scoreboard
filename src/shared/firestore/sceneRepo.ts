import { onSnapshot } from "firebase/firestore";
import { normalizeScenes } from "../normalize";
import type { ScenesApi } from "../store/types";
import type { SceneConfig } from "../types";
import { logSubscriptionError, scenesCol } from "./workspace";

/** Read-only: scenes change on air only through `graphicsDraft.publish` (graphicsDraftRepo.ts). */
export const scenesApi: ScenesApi = {
  subscribe(onChange) {
    return onSnapshot(
      scenesCol(),
      (snap) => onChange(normalizeScenes(snap.docs.map((d) => [d.id, d.data() as Partial<SceneConfig>]))),
      logSubscriptionError("Scenes"),
    );
  },
};
