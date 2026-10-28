import { onSnapshot, writeBatch } from "firebase/firestore";
import { cleanPatch, DRAFT_DOC_IDS, draftPatch, isEmptyPatch, samePatch } from "../graphicsDraft";
import { normalizeDraft } from "../normalize";
import type { GraphicsDraftApi } from "../store/types";
import { SCENE_TYPES } from "../types";
import { db } from "./firebase";
import { draftRef, draftsCol, graphicsRef, logSubscriptionError, sceneRef } from "./workspace";

/**
 * Drafts live in workspaces/{ws}/drafts/ (`graphics`, `scene-{type}`), one doc per patch so
 * a scene's background image never shares a doc with another. Batches, not transactions:
 * they apply locally at once and sync on reconnect.
 */
export const graphicsDraftApi: GraphicsDraftApi = {
  subscribe(onChange) {
    return onSnapshot(
      draftsCol(),
      (snap) => onChange(normalizeDraft(snap.docs.map((d) => [d.id, d.data()]))),
      logSubscriptionError("Graphics draft"),
    );
  },

  async save(next, stored) {
    const batch = writeBatch(db);
    let writes = 0;
    for (const id of DRAFT_DOC_IDS) {
      const patch = draftPatch(next, id);
      if (samePatch(patch, draftPatch(stored, id))) continue;
      // Overwrite (not merge), so fields edited back to their on-air value leave the doc.
      if (isEmptyPatch(patch)) batch.delete(draftRef(id));
      else batch.set(draftRef(id), cleanPatch(patch!));
      writes++;
    }
    if (writes) await batch.commit();
  },

  async publish(draft) {
    const batch = writeBatch(db);
    // mergeFields: each patched field is replaced whole (colors is never deep-merged), the
    // doc's other fields are kept, and a missing doc is created.
    const merge = (patch: object) => ({ mergeFields: Object.keys(patch) });
    if (!isEmptyPatch(draft.graphics)) {
      const patch = cleanPatch(draft.graphics);
      batch.set(graphicsRef(), patch, merge(patch));
    }
    for (const type of SCENE_TYPES) {
      const scene = draft.scenes[type];
      if (isEmptyPatch(scene)) continue;
      const patch = cleanPatch(scene!);
      batch.set(sceneRef(type), patch, merge(patch));
    }
    DRAFT_DOC_IDS.forEach((id) => batch.delete(draftRef(id)));
    await batch.commit();
  },

  async discard() {
    const batch = writeBatch(db);
    DRAFT_DOC_IDS.forEach((id) => batch.delete(draftRef(id)));
    await batch.commit();
  },
};
