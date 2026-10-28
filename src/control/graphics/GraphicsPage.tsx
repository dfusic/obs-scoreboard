import { SCENE_TYPES, type GraphicsDraft, type SceneType } from "@shared/types";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button, cn, PageBody, PageHeader, PanelBoundary } from "../ui";
import { useGraphicsDraft } from "./draftContext";
import { LookBar, LookDialog } from "./LookControls";
import { SceneEditor, SceneGallery } from "./Scenes";
import { StateLegend } from "./status";

/** How many fields a draft changes (colours count once). */
const draftFieldCount = (d: GraphicsDraft) =>
  Object.values(d.graphics).filter((v) => v !== undefined).length +
  Object.values(d.scenes).reduce((n, patch) => n + Object.values(patch ?? {}).filter((v) => v !== undefined).length, 0);

const isScene = (v: string): v is SceneType => (SCENE_TYPES as readonly string[]).includes(v);

/** The scene in `#/graphics/<scene>` (the scene editor), or null for the overview. */
function useGraphicsRoute(): SceneType | null {
  const read = () => {
    const [page, scene = ""] = location.hash.replace(/^#\/?/, "").split("/");
    return page === "graphics" && isScene(scene) ? scene : null;
  };
  const [scene, setScene] = useState(read);
  useEffect(() => {
    const onChange = () => setScene(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return scene;
}

/**
 * Graphics: the look of every scene (theme, colour scheme, transition) and each scene's own
 * settings, in three states: unsaved (this page only, in its previews), saved (shared, not on
 * air) and on air. Only Put on air changes the output. The overview shows the look and a
 * gallery of every scene; a scene opens its editor (`#/graphics/<scene>`). `previewEnabled`:
 * the page has been visited, so its preview iframes may be created.
 */
export function GraphicsPage({ hidden, previewEnabled }: { hidden: boolean; previewEnabled: boolean }) {
  const draft = useGraphicsDraft();
  const route = useGraphicsRoute();
  // The editor stays mounted once opened, so its preview isn't reloaded on every visit.
  const [editorScene, setEditorScene] = useState<SceneType | null>(route);
  useEffect(() => {
    if (route) setEditorScene(route);
  }, [route]);
  const [lookOpen, setLookOpen] = useState(false);

  // Ctrl/Cmd+S saves while this page is visible. A field being typed in is committed first.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => {
    if (hidden) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      const active = document.activeElement;
      if (active instanceof HTMLElement) flushSync(() => active.blur());
      if (draftRef.current.unsaved) draftRef.current.save();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hidden]);

  return (
    <div hidden={hidden}>
      <PageHeader title="Graphics" sub="Edit freely. Save keeps your changes. Only Put on air changes the projector.">
        <StateLegend />
      </PageHeader>
      <StatusBar />
      <PageBody>
        <PanelBoundary name="Look">
          <LookBar previewScene={route ?? "scoreboard"} onEditLook={() => setLookOpen(true)} />
        </PanelBoundary>
        <div hidden={route !== null}>
          <SceneGallery thumbnails={previewEnabled && !hidden && route === null} />
        </div>
        {editorScene && (
          <div hidden={route === null}>
            <SceneEditor type={editorScene} active={!hidden && route !== null} onEditLook={() => setLookOpen(true)} />
          </div>
        )}
      </PageBody>
      <LookDialog open={lookOpen} onClose={() => setLookOpen(false)} scene={route ?? "scoreboard"} />
    </div>
  );
}

/**
 * What isn't on air yet, with what to do about it: unsaved edits (blue: Discard, Save,
 * Save & put on air), else saved changes (amber: Revert to on air, Put on air).
 */
function StatusBar() {
  const draft = useGraphicsDraft();

  const putOnAir = () => {
    if (confirm(`${draft.toAirSummary} will go on air now. The projector changes at once.`)) draft.putOnAir();
  };
  // One changed field is quick to redo; more than that, ask before throwing them away.
  const discard = () => {
    const count = draftFieldCount(draft.local);
    if (count <= 1 || confirm(`Discard your unsaved changes (${draft.unsavedSummary})? Saved and on-air graphics stay as they are.`))
      draft.discardLocal();
  };
  const revert = () => {
    if (confirm(`Drop the saved changes (${draft.summary}) and go back to what's on air? On air stays as it is.`))
      draft.revert();
  };

  const bar = "sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-6 py-2.5 max-[480px]:px-4";
  const text = "min-w-0 flex-1 text-[13px]";

  if (draft.unsaved) {
    return (
      <div role="status" className={cn(bar, "border-accent/50 bg-unsaved-bg")}>
        <span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
        <span className={text}>
          <strong className="font-semibold text-fg">Unsaved changes:</strong>{" "}
          <span className="text-soft">{draft.unsavedSummary}</span>
          {draft.pending && <span className="text-dim"> · also saved, not on air: {draft.summary}</span>}
        </span>
        <Button variant="ghost" onClick={discard}>
          Discard
        </Button>
        <Button variant="ghost" className="border-accent text-fg" onClick={draft.save} title="Ctrl+S">
          Save <kbd className="ml-1 font-sans text-[10px] text-dim">Ctrl+S</kbd>
        </Button>
        <Button variant="primary" className="h-9 bg-danger" onClick={putOnAir}>
          Save &amp; put on air
        </Button>
      </div>
    );
  }
  if (draft.pending) {
    return (
      <div role="status" className={cn(bar, "border-warning/50 bg-pending-bg")}>
        <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
        <span className={text}>
          <strong className="font-semibold text-fg">Saved, not on air:</strong>{" "}
          <span className="text-soft">{draft.summary}</span>
        </span>
        <Button variant="ghost" onClick={revert}>
          Revert to on air
        </Button>
        <Button variant="primary" className="h-9 bg-danger" onClick={putOnAir}>
          Put on air
        </Button>
      </div>
    );
  }
  return (
    <div role="status" className={cn(bar, "border-line text-xs text-dim")}>
      <span className="size-2 shrink-0 rounded-full bg-danger" aria-hidden="true" />
      Everything here is on air.
    </div>
  );
}
