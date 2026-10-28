import { isEmptyPatch } from "@shared/graphicsDraft";
import { useLiveData } from "@shared/react/store";
import { SCENE_LAYOUTS, theme } from "@shared/themes";
import { SCENE_LABELS, SCENE_TYPES, type SceneConfig, type SceneType } from "@shared/types";
import { useMemo, useState } from "react";
import { OutputPreview, StaticScenePreview } from "../OutputPreview";
import { thumbnailData } from "../previewData";
import { Button, cn, Hint, Panel, PanelBoundary, PanelTitle, Spacer } from "../ui";
import { useGraphicsDraft } from "./draftContext";
import { CompetitionPanel, SceneSettingsPanel, type SceneEditProps } from "./SceneSettingsPanel";
import { ChangeDot, type ChangeState } from "./status";

/** A link styled as a ghost button. */
const navButton =
  "inline-flex h-9 items-center rounded-sm border border-line-strong px-4 text-xs text-muted no-underline hover:bg-control hover:text-soft";

/** The scene editor's address. */
export const sceneHref = (type: SceneType) => `#/graphics/${type}`;

/** Whether a scene's own settings have unsaved edits, saved changes not on air, or neither. */
function useSceneState(): (type: SceneType) => ChangeState {
  const { local, changes } = useGraphicsDraft();
  return (type) => (!isEmptyPatch(local.scenes[type]) ? "unsaved" : !isEmptyPatch(changes.scenes[type]) ? "saved" : null);
}

/** A short line on what's special about a scene's settings, e.g. "Large text · own background". */
function sceneMeta(type: SceneType, config: SceneConfig, themeId: string): string {
  const meta: string[] = [];
  const layout = SCENE_LAYOUTS[type]?.find((l) => l.id === config.layout);
  if (layout) meta.push(layout.name);
  if (type === "sponsors" && config.layout === "single") meta.push(`${config.secondsPerSponsor} s per sponsor`);
  if (type === "scoreboard" && themeId === "semafor" && config.logo) meta.push("competition logo");
  if (config.background) meta.push("own background");
  if (!meta.length) meta.push(`${theme(themeId).name} design`);
  return meta.join(" · ");
}

function OnAirBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-danger px-2 py-0.5 font-condensed text-[11px] font-bold tracking-[0.08em] text-white uppercase",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-white" aria-hidden="true" />
      On air
    </span>
  );
}

/** A still of one scene as edited. Mounted only while thumbnails are shown, so hidden cards trim no data. */
function SceneThumbnail({ type }: { type: SceneType }) {
  const live = useLiveData();
  const { shown } = useGraphicsDraft();
  const data = useMemo(() => thumbnailData(live, shown, type), [live, shown, type]);
  return <StaticScenePreview scene={type} data={data} />;
}

/** One scene in the gallery: a still of it as edited, its name and settings, its states. */
function SceneCard({ type, thumbnails }: { type: SceneType; thumbnails: boolean }) {
  const live = useLiveData();
  const { shown } = useGraphicsDraft();
  const state = useSceneState()(type);
  const onAir = live.match.program.scene === type;

  return (
    <a
      href={sceneHref(type)}
      className="group flex flex-col overflow-hidden rounded-md border border-line bg-panel text-fg no-underline hover:border-line-hover"
    >
      <div className="relative">
        {thumbnails ? <SceneThumbnail type={type} /> : <div className="aspect-[2304/1024] bg-black" />}
        {onAir && <OnAirBadge className="absolute top-2 left-2" />}
      </div>
      <div className="flex flex-col gap-0.5 px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-sm font-medium">
          {SCENE_LABELS[type]}
          <ChangeDot state={state} />
          <Spacer />
          <span className="text-xs text-dim group-hover:text-soft">Edit →</span>
        </span>
        <span className="truncate text-xs text-dim">{sceneMeta(type, shown.scenes[type], shown.graphics.theme)}</span>
      </div>
    </a>
  );
}

/**
 * All nine scenes as cards; a card opens its editor. `thumbnails`: show the stills (only while
 * the gallery is visible; hiding it releases their iframes).
 */
export function SceneGallery({ thumbnails }: { thumbnails: boolean }) {
  return (
    <section aria-label="Scenes" className="flex flex-col gap-2.5">
      <h2 className="m-0 font-condensed text-[13px] font-bold tracking-[0.1em] text-soft uppercase">Scenes</h2>
      <div className="grid grid-cols-3 gap-4 max-[1200px]:grid-cols-2 max-[640px]:grid-cols-1">
        {SCENE_TYPES.map((type) => (
          <PanelBoundary key={type} name={SCENE_LABELS[type]}>
            <SceneCard type={type} thumbnails={thumbnails} />
          </PanelBoundary>
        ))}
      </div>
    </section>
  );
}

/**
 * One scene: a big preview (its iframe only while `active`, i.e. the editor is visible) of it as edited (or as on air, to compare) and its own settings.
 * Edits go to the unsaved draft; the status bar saves them or puts them on air.
 */
export function SceneEditor({ type, active, onEditLook }: { type: SceneType; active: boolean; onEditLook: () => void }) {
  const draft = useGraphicsDraft();
  const { match } = useLiveData();
  const sceneState = useSceneState();
  const [version, setVersion] = useState<"yours" | "onAir">("yours");
  const index = SCENE_TYPES.indexOf(type);
  const prev = SCENE_TYPES[(index + SCENE_TYPES.length - 1) % SCENE_TYPES.length];
  const next = SCENE_TYPES[(index + 1) % SCENE_TYPES.length];
  const yours = version === "yours";

  const edit = (t: SceneType): SceneEditProps => ({
    type: t,
    config: draft.shown.scenes[t],
    saved: draft.saved.scenes[t],
    onAir: draft.onAir.scenes[t],
    onChange: (fields) => draft.edit({ graphics: {}, scenes: { [t]: fields } }),
  });

  const segment = (value: "yours" | "onAir", label: string) => (
    <button
      type="button"
      aria-pressed={version === value}
      onClick={() => setVersion(value)}
      className={cn(
        "h-7 border-0 bg-transparent px-3 font-sans text-xs font-medium tracking-normal text-muted normal-case",
        version === value && "rounded-sm bg-control-hover text-fg",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <a href="#/graphics" className="text-[13px] text-soft no-underline hover:text-fg">
          ← All scenes
        </a>
        <h2 className="m-0 flex items-center gap-2 font-condensed text-xl font-black tracking-[0.04em] text-white uppercase">
          {SCENE_LABELS[type]}
          {match.program.scene === type && <OnAirBadge />}
        </h2>
        <Spacer />
        <a href={sceneHref(prev)} className={navButton} aria-label={`Previous scene: ${SCENE_LABELS[prev]}`}>
          ‹ {SCENE_LABELS[prev]}
        </a>
        <a href={sceneHref(next)} className={navButton} aria-label={`Next scene: ${SCENE_LABELS[next]}`}>
          {SCENE_LABELS[next]} ›
        </a>
      </div>
      <nav aria-label="Scene" className="flex flex-wrap gap-1.5">
        {SCENE_TYPES.map((t) => (
          <a
            key={t}
            href={sceneHref(t)}
            aria-current={t === type ? "page" : undefined}
            className={cn(
              "inline-flex h-[30px] items-center gap-1.5 rounded-sm border border-line-strong px-3 text-xs text-muted no-underline hover:text-soft",
              t === type && "border-accent bg-control-hover text-fg",
            )}
          >
            {SCENE_LABELS[t]}
            <ChangeDot state={sceneState(t)} />
          </a>
        ))}
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-4 max-[1100px]:grid-cols-[minmax(0,1fr)]">
        <Panel className="overflow-hidden bg-well">
          <PanelTitle>
            Preview only · not on air
            <Spacer />
            <div role="group" aria-label="Preview shows" className="flex rounded-md border border-line-strong p-0.5">
              {segment("yours", "Your version")}
              {segment("onAir", "On air now")}
            </div>
          </PanelTitle>
          <OutputPreview
            className="rounded-none"
            scene={type}
            active={active}
            graphics={yours ? draft.shown.graphics : null}
            scenes={yours ? draft.toAirScenes : null}
          />
        </Panel>
        <div className="flex min-w-0 flex-col gap-4">
          <PanelBoundary name="Scene settings">
            <SceneSettingsPanel key={type} {...edit(type)} highlight={draft.shown.graphics.colors.highlight} />
          </PanelBoundary>
          {type === "scoreboard" && draft.shown.graphics.theme === "semafor" && (
            <PanelBoundary name="Competition">
              <CompetitionPanel {...edit("scoreboard")} />
            </PanelBoundary>
          )}
          <Hint className="flex flex-wrap items-center gap-1.5">
            Theme, colours and transition apply to every scene:
            <Button variant="small" onClick={onEditLook}>
              Edit look
            </Button>
          </Hint>
        </div>
      </div>
    </div>
  );
}
