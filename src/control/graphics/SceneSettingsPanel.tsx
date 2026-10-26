import { useLiveData, useStore } from "@shared/react/store";
import { SCENE_TEMPLATES } from "@shared/templates";
import { SCENE_LABELS, type SceneConfig, type SceneType } from "@shared/types";
import { BACKGROUND_IMAGE, LOGO_IMAGE } from "../images";
import { TemplateOption, VIDEO_THUMB_BG } from "./ScoreboardTemplates";
import {
  Button,
  CommitInput,
  ErrorText,
  Field,
  Hint,
  Panel,
  PanelBody,
  PanelTitle,
  Thumb,
  UploadButton,
  useImageUpload,
} from "../ui";

/** The scoreboard and player intro have fixed designs; only their background is configurable here. */
const hasTextOptions = (type: SceneType) => type !== "scoreboard" && type !== "presentation";

/** One scene's options. They save as you go and show on air wherever the scene is. */
export function SceneSettingsPanel({ type }: { type: SceneType }) {
  const store = useStore();
  const config = useLiveData().scenes[type];
  const save = (fields: Partial<SceneConfig>) => void store.scenes.update(type, fields);
  const upload = useImageUpload(BACKGROUND_IMAGE, (background) => store.scenes.update(type, { background }));

  return (
    <Panel>
      <PanelTitle>{type === "scoreboard" ? "Background image" : `${SCENE_LABELS[type]} settings`}</PanelTitle>
      <PanelBody>
        {SCENE_TEMPLATES[type] && (
          <Field label="Template">
            <div className="grid grid-cols-2 gap-2.5">
              {SCENE_TEMPLATES[type].map((t) => (
                <TemplateOption
                  key={t.id}
                  name={t.name}
                  selected={config.template === t.id}
                  onPick={() => save({ template: t.id })}
                >
                  <SceneTemplateThumb id={t.id} config={config} />
                </TemplateOption>
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
            <Field label="Accent colour" htmlFor="scene-accent">
              <CommitInput
                id="scene-accent"
                type="color"
                value={config.accentColor}
                onCommit={(v) => save({ accentColor: v })}
              />
            </Field>
            <Field label="Back to scoreboard after (s)" htmlFor="scene-duration">
              <CommitInput
                id="scene-duration"
                type="number"
                min={0}
                max={600}
                placeholder="Stay on air"
                value={config.durationMs ? String(config.durationMs / 1000) : ""}
                onCommit={(v) => {
                  const seconds = Number.parseFloat(v);
                  save({ durationMs: seconds > 0 ? Math.round(seconds * 1000) : null });
                }}
              />
            </Field>
          </div>
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
                  {type === "scoreboard" ? "Remove image" : "Use default video"}
                </Button>
              )}
            </div>
          </div>
          {upload.status && <ErrorText>{upload.status}</ErrorText>}
        </Field>
        {type === "scoreboard" ? (
          <Hint>An image replaces the template's background colour or video. It saves (and goes on air) at once.</Hint>
        ) : (
          <Hint>Changes save as you go and apply wherever this scene is shown.</Hint>
        )}
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

/** A miniature of a scene template, in the scene's accent colour. */
function SceneTemplateThumb({ id, config }: { id: string; config: SceneConfig }) {
  const label = config.title || "Welcome";
  if (id === "largeText") {
    return (
      <div className="flex size-full items-center overflow-hidden" style={{ background: VIDEO_THUMB_BG }}>
        <span className="font-condensed text-[64px] leading-none font-black whitespace-nowrap text-white uppercase">
          {label}
          <span className="mx-2 inline-block size-3 rounded-full align-middle" style={{ background: config.accentColor }} />
          {label}
        </span>
      </div>
    );
  }
  return (
    <div className="flex size-full items-center justify-center p-2" style={{ background: VIDEO_THUMB_BG }}>
      <div
        className="flex size-full flex-col gap-1 rounded-sm border-t-2 bg-[#0a0c10]/90 px-2 py-1.5"
        style={{ borderColor: config.accentColor }}
      >
        <span
          className="truncate font-condensed text-[11px] leading-none font-black uppercase"
          style={{ color: config.accentColor }}
        >
          {label}
        </span>
        <div className="flex flex-1 items-center justify-around">
          <span className="size-5 rounded-full bg-white/20" />
          <span className="font-condensed text-[9px] font-bold" style={{ color: config.accentColor }}>
            VS
          </span>
          <span className="size-5 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}
