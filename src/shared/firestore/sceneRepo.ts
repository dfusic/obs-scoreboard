import { onSnapshot, setDoc } from "firebase/firestore";
import { normalizeScenes } from "../normalize";
import type { ScenesApi } from "../store/types";
import type { SceneConfig } from "../types";
import { logSubscriptionError, sceneRef, scenesCol } from "./workspace";

export const scenesApi: ScenesApi = {
  subscribe(onChange) {
    return onSnapshot(
      scenesCol(),
      (snap) => onChange(normalizeScenes(snap.docs.map((d) => [d.id, d.data() as Partial<SceneConfig>]))),
      logSubscriptionError("Scenes"),
    );
  },

  // Merge-writes, so the doc is created on first edit.
  async update(type, fields) {
    await setDoc(sceneRef(type), fields, { merge: true });
  },
};
