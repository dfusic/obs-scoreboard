import { withoutUndefined } from "./objects";
import { sameColors } from "./themes";
import {
  SCENE_LABELS,
  SCENE_TYPES,
  type GraphicsDraft,
  type GraphicsPatch,
  type OnAirGraphics,
  type ScenePatch,
  type SceneType,
} from "./types";

/**
 * Graphics drafts: pure helpers, backend-neutral and tested (graphicsDraft.test.ts).
 *
 * A draft is what the Graphics page changed but hasn't put on air: one patch for the global
 * look and one per scene, each holding only fields that differ from on air. The page shows
 * `applyDraft(onAir, draft, edit)` and saves `diffDraft(onAir, shown)`, so editing a field
 * back to its on-air value empties it again. A patch can go stale (on air changed under it,
 * e.g. from another device); `draftChanges()` only counts what still differs.
 */

/** Draft doc ids under drafts/: the global look, then one per scene. */
export const GRAPHICS_DRAFT_ID = "graphics";
export const sceneDraftId = (type: SceneType) => `scene-${type}`;
export const DRAFT_DOC_IDS: readonly string[] = [GRAPHICS_DRAFT_ID, ...SCENE_TYPES.map(sceneDraftId)];

/** The scene fields a draft can hold (everything but the unused accentColor). */
export const SCENE_PATCH_KEYS = ["title", "subtitle", "background", "logo", "layout", "secondsPerSponsor"] as const;
type ScenePatchKey = (typeof SCENE_PATCH_KEYS)[number];
const GRAPHICS_PATCH_KEYS = ["theme", "colors", "transition"] as const;

/** On air with the patches applied in order (later wins). */
export function applyDraft(onAir: OnAirGraphics, ...patches: GraphicsDraft[]): OnAirGraphics {
  let graphics = { ...onAir.graphics, colors: { ...onAir.graphics.colors } };
  const scenes = { ...onAir.scenes };
  for (const patch of patches) {
    graphics = { ...graphics, ...cleanPatch(patch.graphics), colors: { ...(patch.graphics.colors ?? graphics.colors) } };
    for (const type of SCENE_TYPES) {
      const scene = patch.scenes[type];
      if (scene) scenes[type] = { ...scenes[type], ...cleanPatch(scene) };
    }
  }
  return { graphics, scenes };
}

/** The fields of `shown` that differ from on air, as a draft. Colours, if changed, are the whole set. */
export function diffDraft(onAir: OnAirGraphics, shown: OnAirGraphics): GraphicsDraft {
  const graphics: GraphicsPatch = {};
  if (shown.graphics.theme !== onAir.graphics.theme) graphics.theme = shown.graphics.theme;
  if (!sameColors(shown.graphics.colors, onAir.graphics.colors)) graphics.colors = { ...shown.graphics.colors };
  if (shown.graphics.transition !== onAir.graphics.transition) graphics.transition = shown.graphics.transition;
  const scenes: GraphicsDraft["scenes"] = {};
  for (const type of SCENE_TYPES) {
    const patch: ScenePatch = {};
    for (const key of SCENE_PATCH_KEYS) {
      if (shown.scenes[type][key] !== onAir.scenes[type][key]) setField(patch, key, shown.scenes[type][key]);
    }
    if (!isEmptyPatch(patch)) scenes[type] = patch;
  }
  return { graphics, scenes };
}

const setField = <K extends ScenePatchKey>(patch: ScenePatch, key: K, value: ScenePatch[K]) => {
  patch[key] = value;
};

/** True when no key of the patch is set (undefined counts as unset). */
export function isEmptyPatch(patch: GraphicsPatch | ScenePatch | undefined): boolean {
  return !patch || Object.values(patch).every((v) => v === undefined);
}

export function isEmptyDraft(draft: GraphicsDraft): boolean {
  return isEmptyPatch(draft.graphics) && SCENE_TYPES.every((type) => isEmptyPatch(draft.scenes[type]));
}

/** Whether two patches hold exactly the same fields and values (decides which draft docs to write). */
export function samePatch(a: GraphicsPatch | ScenePatch | undefined, b: GraphicsPatch | ScenePatch | undefined): boolean {
  const entries = (p: object | undefined) =>
    Object.entries(p ?? {}).filter(([, v]) => v !== undefined) as [string, unknown][];
  const ea = entries(a);
  const mb = new Map(entries(b));
  if (ea.length !== mb.size) return false;
  return ea.every(([key, value]) => {
    if (!mb.has(key)) return false;
    const other = mb.get(key);
    if (value && other && typeof value === "object" && typeof other === "object") {
      const va = value as Record<string, unknown>;
      const vb = other as Record<string, unknown>;
      const keys = new Set([...Object.keys(va), ...Object.keys(vb)]);
      return [...keys].every((k) => va[k] === vb[k]);
    }
    return value === other;
  });
}

/** The draft's patch for a doc id (see DRAFT_DOC_IDS). */
export function draftPatch(draft: GraphicsDraft, docId: string): GraphicsPatch | ScenePatch | undefined {
  if (docId === GRAPHICS_DRAFT_ID) return draft.graphics;
  const type = SCENE_TYPES.find((t) => sceneDraftId(t) === docId);
  return type ? draft.scenes[type] : undefined;
}

/** A copy of the patch without undefined values (backends reject or mis-store them). */
export function cleanPatch<P extends GraphicsPatch | ScenePatch>(patch: P): P {
  return withoutUndefined(patch) as P;
}

/** What the draft still changes on air: stale fields (now equal to on air) don't count. */
export function draftChanges(onAir: OnAirGraphics, draft: GraphicsDraft): GraphicsDraft {
  return diffDraft(onAir, applyDraft(onAir, draft));
}

const GRAPHICS_LABELS: Record<(typeof GRAPHICS_PATCH_KEYS)[number], string> = {
  theme: "Theme",
  colors: "Colours",
  transition: "Transition",
};

/**
 * A short operator-facing list of what changed, e.g. "Theme, Colours, Welcome and 2 more":
 * the global fields first, then each changed scene. "" when nothing changed. Pass the
 * result of `draftChanges()`.
 */
export function summarizeDraft(
  changes: GraphicsDraft,
  sceneLabel: (type: SceneType) => string = (type) => SCENE_LABELS[type],
  max = 3,
): string {
  const items = [
    ...GRAPHICS_PATCH_KEYS.filter((key) => changes.graphics[key] !== undefined).map((key) => GRAPHICS_LABELS[key]),
    ...SCENE_TYPES.filter((type) => !isEmptyPatch(changes.scenes[type])).map(sceneLabel),
  ];
  if (items.length <= max) return items.join(", ");
  return `${items.slice(0, max).join(", ")} and ${items.length - max} more`;
}
