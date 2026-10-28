import type { LiveData } from "./liveFeed";
import type { GraphicsSettings, SceneConfigs, SceneType } from "./types";

/**
 * Messages from the control page to an output page it embeds as a preview (iframe, same
 * origin; the output checks `e.origin === location.origin`). They change only that
 * preview, never what's on air. Send with `frame.contentWindow.postMessage(msg, location.origin)`,
 * again on the iframe's `load` (the output ignores messages sent before it has loaded).
 */

/** Shows this scene instead of the one on air (null: follow on air). Same as `?scene=<type>`. */
export interface PreviewSceneMessage {
  type: "preview-scene";
  scene: SceneType | null;
}

/** Shows this look (theme, colours, transition) instead of the saved one; null: the saved one. */
export interface PreviewGraphicsMessage {
  type: "preview-graphics";
  graphics: GraphicsSettings | null;
}

/**
 * Shows these scene configs instead of the saved ones (e.g. a Graphics draft:
 * `applyDraft(onAir, draft).scenes`). Each given scene's fields are merged over its saved
 * config; scenes left out stay as saved. null: all saved.
 */
export interface PreviewScenesMessage {
  type: "preview-scenes";
  scenes: Partial<SceneConfigs> | null;
}

/** Plays the transition again onto the scene shown. */
export interface PreviewTransitionMessage {
  type: "preview-transition";
}

/**
 * Static thumbnail page only (see `staticOutputUrl`): everything the page renders. A full `LiveData`
 * (structured clone keeps the players Map). The page renders nothing until the first one.
 */
export interface PreviewDataMessage {
  type: "preview-data";
  data: LiveData;
}

/**
 * The other way, static thumbnail page → embedding control page (`window.parent`, posted
 * with `location.origin`): its `preview-data` listener is registered, so data sent now is
 * received. The control resends `preview-data` on it; an iframe `load` alone can come
 * before React has mounted the listener, leaving the thumbnail blank.
 */
export const STATIC_READY = "static-ready";

export interface StaticReadyMessage {
  type: typeof STATIC_READY;
}

export function isStaticReady(data: unknown): data is StaticReadyMessage {
  return typeof data === "object" && data !== null && (data as { type?: unknown }).type === STATIC_READY;
}

export type PreviewMessage =
  | PreviewSceneMessage
  | PreviewGraphicsMessage
  | PreviewScenesMessage
  | PreviewTransitionMessage
  | PreviewDataMessage;

/**
 * The static thumbnail page (src/overlay/static.html, next to the output page) showing one
 * scene: no store and no Firebase (data comes only from `preview-data` messages), no
 * background video, only that scene's section, cut transitions and every animation at its
 * end state. For galleries of many small previews; send `preview-data` on the iframe's
 * `load` and whenever the data changes. `outputUrl` is the output page's address.
 */
export function staticOutputUrl(outputUrl: string, scene: SceneType): string {
  const url = new URL("static.html", outputUrl);
  url.searchParams.set("scene", scene);
  return url.href;
}
