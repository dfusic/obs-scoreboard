import { onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { DEFAULT_SCENE_CONFIGS, SCENE_TYPES, type SceneConfig, type SceneType } from "./types";
import { sceneRef, scenesCol, logSubscriptionError } from "./workspace";

export type SceneConfigs = Record<SceneType, SceneConfig>;

export function defaultSceneConfigs(): SceneConfigs {
  return structuredClone(DEFAULT_SCENE_CONFIGS);
}

/** All scene templates, with defaults for any not customised yet. */
export function subscribeToScenes(onChange: (scenes: SceneConfigs) => void): Unsubscribe {
  return onSnapshot(scenesCol(), (snap) => {
    const scenes = defaultSceneConfigs();
    for (const d of snap.docs) {
      if ((SCENE_TYPES as readonly string[]).includes(d.id)) {
        const type = d.id as SceneType;
        scenes[type] = { ...scenes[type], ...(d.data() as Partial<SceneConfig>) };
      }
    }
    onChange(scenes);
  }, logSubscriptionError("Scenes"));
}

/** Merge-writes, so the doc is created on first edit. */
export async function updateScene(type: SceneType, fields: Partial<SceneConfig>): Promise<void> {
  await setDoc(sceneRef(type), fields, { merge: true });
}
