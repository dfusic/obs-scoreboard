import { useLiveData, useStore } from "@shared/react/store";
import { SCENE_LABELS, SCENE_TYPES, type SceneConfig, type SceneType } from "@shared/types";
import { useState } from "react";
import { BACKGROUND_IMAGE } from "../images";
import { OutputPreview } from "../OutputPreview";
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
  Thumb,
  UploadButton,
  useImageUpload,
} from "../ui";

/** The scoreboard and player intro have fixed designs; only their background is configurable. */
const hasTextOptions = (type: SceneType) => type !== "scoreboard" && type !== "presentation";

export function SceneSettingsPanel({ previewEnabled }: { previewEnabled: boolean }) {
  const store = useStore();
  const { scenes } = useLiveData();
  const [selected, setSelected] = useState<SceneType>("welcome");
  const config = scenes[selected];
  const save = (fields: Partial<SceneConfig>) => void store.scenes.update(selected, fields);
  const upload = useImageUpload(BACKGROUND_IMAGE, (background) => store.scenes.update(selected, { background }));

  return (
    <Panel>
      <PanelTitle>Scenes</PanelTitle>
      <PanelBody>
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {SCENE_TYPES.map((type) => (
            <Button
              key={type}
              variant="tab"
              role="tab"
              aria-selected={type === selected}
              className={cn(type === selected && "border-accent bg-control-hover text-fg")}
              onClick={() => setSelected(type)}
            >
              {SCENE_LABELS[type]}
            </Button>
          ))}
        </div>
        {previewEnabled && <OutputPreview scene={selected} />}
        <Hint>Preview only. Nothing here goes on air until you take the scene on the Live page.</Hint>

        {/* Keyed by scene so switching tabs shows that scene's values. */}
        {hasTextOptions(selected) && (
          <div key={selected} className="grid grid-cols-2 gap-3">
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

        <Field label="Background">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line-strong bg-well text-faint">
              <Thumb url={config.background} className="size-full object-cover" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <UploadButton onChange={upload.onChange}>Upload background</UploadButton>
              {config.background && (
                <Button variant="ghost" className="h-7 w-full text-[11px]" onClick={() => save({ background: null })}>
                  Use default video
                </Button>
              )}
            </div>
          </div>
          {upload.status && <ErrorText>{upload.status}</ErrorText>}
        </Field>
      </PanelBody>
    </Panel>
  );
}
