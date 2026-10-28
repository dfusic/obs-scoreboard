import { applyDraft, diffDraft, draftChanges, isEmptyDraft, samePatch, summarizeDraft } from "@shared/graphicsDraft";
import { useLiveData, useStore } from "@shared/react/store";
import { EMPTY_DRAFT, SCENE_TYPES, type GraphicsDraft, type OnAirGraphics, type SceneConfigs } from "@shared/types";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * The Graphics page's three states, for every page of the control:
 * - **unsaved** (`local`): edits on this page only, shown in its previews;
 * - **saved, not on air** (`stored`): the shared draft (`store.graphicsDraft`);
 * - **on air** (`onAir`): the graphics and scene configs the output shows.
 * The page shows `shown = applyDraft(onAir, stored, local)`.
 */
export interface GraphicsDraftState {
  onAir: OnAirGraphics;
  /** The shared draft as stored (may hold stale fields; use `changes`). */
  stored: GraphicsDraft;
  /** What the stored draft still changes on air. */
  changes: GraphicsDraft;
  /** Saved changes not on air yet. */
  pending: boolean;
  /** `changes` in a few words, e.g. "Theme, Welcome". */
  summary: string;
  /** On air with the stored draft applied: what Save last kept. */
  saved: OnAirGraphics;
  /** What the Graphics page shows: saved plus this page's unsaved edits. */
  shown: OnAirGraphics;
  /** This page's edits since the last save, minimal (only fields that differ from `saved`). */
  local: GraphicsDraft;
  unsaved: boolean;
  unsavedSummary: string;
  /** Everything shown that isn't on air: what Put on air changes. */
  toAir: GraphicsDraft;
  toAirSummary: string;
  /** The shown configs of the scenes in `toAir`, for a preview's `preview-scenes`. */
  toAirScenes: Partial<SceneConfigs>;
  /** Applies a patch to the unsaved edits (a field set back to its saved value drops out). */
  edit(patch: GraphicsDraft): void;
  /** Drops the unsaved edits. */
  discardLocal(): void;
  /** Stores what's shown as the draft; nothing goes on air. */
  save(): void;
  /** Puts everything shown on air (saved and unsaved). */
  putOnAir(): void;
  /** Drops the saved draft and the unsaved edits: back to what's on air. */
  revert(): void;
}

/** Whether two drafts hold the same patches. */
const sameDraft = (a: GraphicsDraft, b: GraphicsDraft) =>
  samePatch(a.graphics, b.graphics) && SCENE_TYPES.every((type) => samePatch(a.scenes[type], b.scenes[type]));

/**
 * Runs a draft computation. A malformed draft (e.g. from a broken or newer client) falls back
 * to "no draft" instead of crashing every page under the provider (Live included).
 */
function safely<T>(compute: () => T, fallback: () => T): T {
  try {
    return compute();
  } catch (error) {
    console.error("Graphics draft ignored:", error);
    return fallback();
  }
}

const GraphicsDraftContext = createContext<GraphicsDraftState | null>(null);

export function useGraphicsDraft(): GraphicsDraftState {
  const value = useContext(GraphicsDraftContext);
  if (!value) throw new Error("useGraphicsDraft() outside <GraphicsDraftProvider>");
  return value;
}

/**
 * Holds the Graphics draft for the whole control page (inside LiveDataProvider). Unsaved
 * edits live here too, so they survive switching pages and the sidebar can flag them.
 * `onStatus` reports the flags to components outside the live data (the sidebar).
 */
export function GraphicsDraftProvider({
  onStatus,
  children,
}: {
  onStatus?: (status: { pending: boolean; unsaved: boolean }) => void;
  children: ReactNode;
}) {
  const store = useStore();
  const data = useLiveData();
  const [received, setReceived] = useState<GraphicsDraft>(EMPTY_DRAFT);
  // What we just wrote, until the subscription reports it (avoids a flash of the old draft).
  const [optimistic, setOptimistic] = useState<GraphicsDraft | null>(null);
  const [local, setLocal] = useState<GraphicsDraft>(EMPTY_DRAFT);

  useEffect(
    () =>
      store.graphicsDraft.subscribe((draft) => {
        setReceived(draft);
        setOptimistic(null);
      }),
    [store],
  );

  const stored = optimistic ?? received;
  const onAir = useMemo<OnAirGraphics>(() => ({ graphics: data.graphics, scenes: data.scenes }), [data.graphics, data.scenes]);
  const saved = useMemo(() => safely(() => applyDraft(onAir, stored), () => onAir), [onAir, stored]);
  const shown = useMemo(() => safely(() => applyDraft(saved, local), () => saved), [saved, local]);

  const latest = useRef({ onAir, stored, saved, shown });
  latest.current = { onAir, stored, saved, shown };

  /**
   * Runs `write` and shows `next` as the stored draft until the subscription reports it or
   * the write settles (a write that changes nothing fires no snapshot). When `next` is what's
   * stored already, `write` isn't run (callers that must write run it first and pass its promise).
   */
  const wrote = (write: () => Promise<void>, next: GraphicsDraft) => {
    if (sameDraft(next, latest.current.stored)) return;
    const p = write();
    setOptimistic(next);
    void p.finally(() => setOptimistic((current) => (current === next ? null : current)));
  };

  const value = useMemo<GraphicsDraftState>(() => {
    const changes = safely(() => draftChanges(onAir, stored), () => EMPTY_DRAFT);
    const unsavedChanges = safely(() => diffDraft(saved, shown), () => EMPTY_DRAFT);
    const toAir = safely(() => diffDraft(onAir, shown), () => EMPTY_DRAFT);
    return {
      onAir,
      stored,
      changes,
      pending: !isEmptyDraft(changes),
      summary: summarizeDraft(changes),
      saved,
      shown,
      local,
      unsaved: !isEmptyDraft(unsavedChanges),
      unsavedSummary: summarizeDraft(unsavedChanges),
      toAir,
      toAirSummary: summarizeDraft(toAir),
      toAirScenes: Object.fromEntries(
        SCENE_TYPES.filter((type) => toAir.scenes[type]).map((type) => [type, shown.scenes[type]]),
      ),
      edit: (patch) =>
        setLocal((prev) => {
          const base = latest.current.saved;
          return safely(() => diffDraft(base, applyDraft(base, prev, patch)), () => prev);
        }),
      discardLocal: () => setLocal(EMPTY_DRAFT),
      save: () => {
        const { onAir, stored, shown } = latest.current;
        const next = diffDraft(onAir, shown);
        // Not written at all when the draft already holds exactly this.
        wrote(() => store.graphicsDraft.save(next, stored), next);
        setLocal(EMPTY_DRAFT);
      },
      putOnAir: () => {
        const { onAir, shown } = latest.current;
        const next = diffDraft(onAir, shown);
        const p = store.graphicsDraft.publish(next);
        wrote(() => p, EMPTY_DRAFT);
        setLocal(EMPTY_DRAFT);
      },
      revert: () => {
        const p = store.graphicsDraft.discard();
        wrote(() => p, EMPTY_DRAFT);
        setLocal(EMPTY_DRAFT);
      },
    };
  }, [store, onAir, stored, saved, shown, local]);

  const { pending, unsaved } = value;
  useEffect(() => onStatus?.({ pending, unsaved }), [onStatus, pending, unsaved]);

  // Unsaved edits are lost on reload or close: ask first.
  useEffect(() => {
    if (!unsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [unsaved]);

  return <GraphicsDraftContext.Provider value={value}>{children}</GraphicsDraftContext.Provider>;
}

/** For the Live page's on-air strip: saved graphics changes that aren't on air yet. */
export function GraphicsPendingLink() {
  const { pending, summary } = useGraphicsDraft();
  if (!pending) return null;
  return (
    <a
      href="#/graphics"
      className="inline-flex items-center gap-2 rounded-full border border-warning/60 px-3 py-1 text-xs font-medium text-warning no-underline hover:bg-warning/10"
    >
      <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
      Graphics: {summary} not on air
    </a>
  );
}
