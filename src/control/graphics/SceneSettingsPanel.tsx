import { useLiveData, useStore } from "@shared/react/store";
import { MAX_SECONDS_PER_SPONSOR, MIN_SECONDS_PER_SPONSOR, secondsPerSponsor } from "@shared/sponsors";
import { SCENE_LAYOUTS } from "@shared/themes";
import { SCENE_LABELS, type SceneConfig, type SceneType } from "@shared/types";
import { BACKGROUND_IMAGE, LOGO_IMAGE } from "../images";
import { PickerOption, ScopeTag, VIDEO_THUMB_BG } from "./ThemePanels";
import {
  Button,
  cn,
  CommitInput,
  ErrorText,
  Field,
  Hint,
  Panel,
  PanelBody,
  PanelTitle,
  Spacer,
  Thumb,
  UploadButton,
  useImageUpload,
} from "../ui";

/**
 * The scoreboard and the player intro design (also the player card) are fixed; only their
 * background is configurable here.
 */
const hasTextOptions = (type: SceneType) => type !== "scoreboard" && type !== "presentation" && type !== "playerCard";

/**
 * One scene's own options (its colours come from the global colour scheme). They save as
 * you go and show on air wherever the scene is. `highlight` is the colour scheme's, for
 * the layout thumbnails.
 */
export function SceneSettingsPanel({ type, highlight }: { type: SceneType; highlight: string }) {
  const store = useStore();
  const config = useLiveData().scenes[type];
  const save = (fields: Partial<SceneConfig>) => void store.scenes.update(type, fields);
  const upload = useImageUpload(BACKGROUND_IMAGE, (background) => store.scenes.update(type, { background }));

  return (
    <Panel>
      <PanelTitle>
        {type === "scoreboard" ? "Background image" : `${SCENE_LABELS[type]} settings`}
        <Spacer />
        <ScopeTag>This scene</ScopeTag>
      </PanelTitle>
      <PanelBody>
        {SCENE_LAYOUTS[type] && (
          <Field label="Layout">
            <div className="grid grid-cols-2 gap-2.5">
              {SCENE_LAYOUTS[type].map((l) => (
                <PickerOption
                  key={l.id}
                  name={l.name}
                  selected={config.layout === l.id}
                  onPick={() => save({ layout: l.id })}
                >
                  <SceneLayoutThumb id={l.id} title={config.title} highlight={highlight} />
                </PickerOption>
              ))}
            </div>
          </Field>
        )}

        {/* Keyed by scene so switching tabs shows that scene's values. */}
        {hasTextOptions(type) && (
          <div key={type} className="grid grid-cols-2 gap-3">
            <Field label="Title" htmlFor="scene-title">
              <CommitInput id="scene-title" type="text" value={config.title} onCommit={(v) => save({ title: v.trim() })} />
            </Field>
            <Field label="Subtitle" htmlFor="scene-subtitle">
              <CommitInput
                id="scene-subtitle"
                type="text"
                value={config.subtitle}
                onCommit={(v) => save({ subtitle: v.trim() })}
              />
            </Field>
          </div>
        )}

        {type === "sponsors" && config.layout === "single" && (
          <Field label="Seconds per sponsor" htmlFor="scene-seconds">
            <CommitInput
              key={type}
              id="scene-seconds"
              type="number"
              min={MIN_SECONDS_PER_SPONSOR}
              max={MAX_SECONDS_PER_SPONSOR}
              step={1}
              value={String(config.secondsPerSponsor)}
              onCommit={(v) => save({ secondsPerSponsor: secondsPerSponsor(Number(v)) })}
              className="w-28"
            />
          </Field>
        )}
        {type === "sponsors" && (
          <Hint>
            {config.layout === "single"
              ? "One sponsor logo at a time, main sponsors first, starting over each time the scene is taken. The title isn't shown."
              : "All sponsor logos at once with the title on top (leave it empty for none). Manage the logos on the Sponsors page."}
          </Hint>
        )}

        <Field label={type === "scoreboard" ? "Image" : "Background"}>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line-strong bg-well text-faint">
              <Thumb url={config.background} className="size-full object-cover" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <UploadButton onChange={upload.onChange}>Upload background</UploadButton>
              {config.background && (
                <Button variant="ghost" className="h-7 w-full text-[11px]" onClick={() => save({ background: null })}>
                  Remove image
                </Button>
              )}
            </div>
          </div>
          {upload.status && <ErrorText>{upload.status}</ErrorText>}
        </Field>
        <Hint>
          An image replaces the colour scheme's background (colour or video) on this scene only. Changes save as you go
          and apply wherever this scene is shown.
        </Hint>
      </PanelBody>
    </Panel>
  );
}

/**
 * The competition shown in the middle of the Semafor scoreboard: a logo, or two lines
 * of text without one. Stored on the scoreboard scene (logo, title, subtitle).
 */
export function CompetitionPanel() {
  const store = useStore();
  const config = useLiveData().scenes.scoreboard;
  const save = (fields: Partial<SceneConfig>) => void store.scenes.update("scoreboard", fields);
  const upload = useImageUpload(LOGO_IMAGE, (logo) => store.scenes.update("scoreboard", { logo }));

  return (
    <Panel>
      <PanelTitle>Competition</PanelTitle>
      <PanelBody>
        <Field label="Logo">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line-strong bg-well text-faint">
              <Thumb url={config.logo} className="size-full object-contain" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <UploadButton onChange={upload.onChange}>Upload logo</UploadButton>
              {config.logo && (
                <Button variant="ghost" className="h-7 w-full text-[11px]" onClick={() => save({ logo: null })}>
                  Remove logo
                </Button>
              )}
            </div>
          </div>
          {upload.status && <ErrorText>{upload.status}</ErrorText>}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Line 1" htmlFor="competition-title">
            <CommitInput
              id="competition-title"
              type="text"
              placeholder="e.g. Treća NL"
              value={config.title}
              onCommit={(v) => save({ title: v.trim() })}
            />
          </Field>
          <Field label="Line 2" htmlFor="competition-subtitle">
            <CommitInput
              id="competition-subtitle"
              type="text"
              placeholder="e.g. Sjever"
              value={config.subtitle}
              onCommit={(v) => save({ subtitle: v.trim() })}
            />
          </Field>
        </div>
        <Hint>Shown above the score. A logo (transparent PNG) replaces the two lines of text. Saves at once.</Hint>
      </PanelBody>
    </Panel>
  );
}

/** Sponsors layouts: a grid of logo boxes under the title, or one large logo. */
function SponsorLayoutThumb({ single, title, highlight }: { single: boolean; title: string; highlight: string }) {
  const box = "rounded-[2px] bg-white/25";
  if (single) {
    return (
      <div className="flex size-full items-center justify-center" style={{ background: VIDEO_THUMB_BG }}>
        <span className="h-3/5 w-2/5 rounded-sm bg-white/30" />
      </div>
    );
  }
  return (
    <div className="flex size-full items-center justify-center p-2" style={{ background: VIDEO_THUMB_BG }}>
      <div
        className="flex size-full flex-col gap-1 rounded-sm border-t-2 bg-[#0a0c10]/90 px-2 py-1.5"
        style={{ borderColor: highlight }}
      >
        {title && (
          <span className="truncate font-condensed text-[11px] leading-none font-black uppercase" style={{ color: highlight }}>
            {title}
          </span>
        )}
        <div className="flex flex-1 justify-center gap-1.5">
          <span className={cn(box, "w-1/3")} />
          <span className={cn(box, "w-1/3")} />
        </div>
        <div className="grid flex-1 grid-cols-4 gap-1">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className={cn(box, "bg-white/15")} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** A miniature of a scene layout, in the colour scheme's highlight. */
function SceneLayoutThumb({ id, title, highlight }: { id: string; title: string; highlight: string }) {
  const label = title || "Welcome";
  if (id === "grid" || id === "single") return <SponsorLayoutThumb single={id === "single"} title={title} highlight={highlight} />;
  if (id === "largeText") {
    return (
      <div className="flex size-full items-center overflow-hidden" style={{ background: VIDEO_THUMB_BG }}>
        <span className="font-condensed text-[64px] leading-none font-black whitespace-nowrap text-white uppercase">
          {label}
          <span className="mx-2 inline-block size-3 rounded-full align-middle" style={{ background: highlight }} />
          {label}
        </span>
      </div>
    );
  }
  return (
    <div className="flex size-full items-center justify-center p-2" style={{ background: VIDEO_THUMB_BG }}>
      <div
        className="flex size-full flex-col gap-1 rounded-sm border-t-2 bg-[#0a0c10]/90 px-2 py-1.5"
        style={{ borderColor: highlight }}
      >
        <span
          className="truncate font-condensed text-[11px] leading-none font-black uppercase"
          style={{ color: highlight }}
        >
          {label}
        </span>
        <div className="flex flex-1 items-center justify-around">
          <span className="size-5 rounded-full bg-white/20" />
          <span className="font-condensed text-[9px] font-bold" style={{ color: highlight }}>
            VS
          </span>
          <span className="size-5 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}
