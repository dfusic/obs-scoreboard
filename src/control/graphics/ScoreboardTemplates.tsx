import { LAYOUT_COLORS, SCOREBOARD_TEMPLATES, scoreboardTemplate, type ScoreboardTemplate } from "@shared/templates";
import type { GraphicsSettings, ScoreboardColors } from "@shared/types";
import type { ReactNode } from "react";
import { Button, cn, Hint, Panel, PanelBody, PanelTitle, Spacer } from "../ui";

/** Stand-in for the background video in thumbnails. */
export const VIDEO_THUMB_BG = "radial-gradient(ellipse at 30% 60%, #3a0808 0%, #1a0303 40%, #000 100%)";

const thumbText = "font-condensed font-black leading-none tabular-nums";

/** A miniature of the template's layout in the given colours. */
function TemplateThumb({ template, colors }: { template: ScoreboardTemplate; colors: ScoreboardColors }) {
  const background = colors.background ?? VIDEO_THUMB_BG;
  if (template.layout === "classic") {
    return (
      <div className="relative size-full" style={{ background }}>
        <div
          className={cn(thumbText, "absolute top-0 left-1/2 -translate-x-1/2 rounded-b-md px-2.5 py-1 text-[13px]")}
          style={{ background: colors.accent, color: colors.timer }}
        >
          45:00
        </div>
        <div className="absolute top-[55%] left-[16%] aspect-square w-[22%] -translate-1/2 rounded-full bg-white/15" />
        <div className="absolute top-[55%] left-[84%] aspect-square w-[22%] -translate-1/2 rounded-full bg-white/15" />
        <div className={cn(thumbText, "absolute top-[64%] left-1/2 -translate-1/2 text-[26px]")} style={{ color: colors.score }}>
          2:1
        </div>
      </div>
    );
  }
  const side = (score: number, name: string) => (
    <div className="flex-1 text-center">
      <div className={cn(thumbText, "text-xl")} style={{ color: colors.score }}>
        {score}
      </div>
      <div className="font-condensed text-[9px] font-bold tracking-[0.06em] uppercase" style={{ color: colors.names }}>
        {name}
      </div>
    </div>
  );
  return (
    <div className="flex size-full items-center gap-2 p-2.5" style={{ background }}>
      {side(2, "Home")}
      <div className="text-center">
        <div className="font-condensed text-[11px] font-semibold tabular-nums" style={{ color: colors.timer }}>
          45:00
        </div>
        <div className="my-[3px] h-px" style={{ background: colors.accent }} />
        <div className="font-condensed text-[7px] font-bold tracking-[0.06em] uppercase" style={{ color: colors.accent }}>
          1st
        </div>
      </div>
      {side(1, "Away")}
    </div>
  );
}

/** One template in a picker grid: its thumbnail and name. */
export function TemplateOption({
  name,
  selected,
  onPick,
  children,
}: {
  name: string;
  selected: boolean;
  onPick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      className="flex flex-col gap-1.5 border-0 bg-transparent p-0 text-[11px] text-muted"
    >
      <span
        className={cn(
          "block aspect-video w-full overflow-hidden rounded-lg border-2 border-transparent",
          selected && "border-accent",
        )}
      >
        {children}
      </span>
      <span className={cn("self-center", selected && "text-fg")}>{name}</span>
    </button>
  );
}

/** The template grid. Picking one starts a draft with its default colours. */
export function TemplatePicker({ value, onPick }: { value: GraphicsSettings; onPick: (id: string) => void }) {
  return (
    <Panel>
      <PanelTitle>Choose template</PanelTitle>
      <PanelBody>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
          {SCOREBOARD_TEMPLATES.map((t) => {
            const selected = t.id === value.template;
            return (
              <TemplateOption key={t.id} name={t.name} selected={selected} onPick={() => onPick(t.id)}>
                <TemplateThumb template={t} colors={selected ? value.colors : t.colors} />
              </TemplateOption>
            );
          })}
        </div>
      </PanelBody>
    </Panel>
  );
}

/**
 * Colours of the chosen template. Edits are a draft shown only in the preview until
 * saved, so the look can be tried out while the scoreboard is on air.
 */
export function ColorsPanel({
  value,
  dirty,
  onChange,
  onSave,
  onDiscard,
}: {
  value: GraphicsSettings;
  dirty: boolean;
  onChange: (next: GraphicsSettings) => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const template = scoreboardTemplate(value.template);
  const set = (colors: Partial<ScoreboardColors>) => onChange({ ...value, colors: { ...value.colors, ...colors } });

  return (
    <Panel>
      <PanelTitle>
        Customize colours
        <Spacer />
        {dirty && <span className="tracking-[0.08em] text-warning normal-case">Unsaved</span>}
      </PanelTitle>
      <PanelBody>
        <div className="text-[13px] text-soft">
          Template: <strong className="text-fg">{template.name}</strong>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {LAYOUT_COLORS[template.layout].map(({ key, label }) => {
            const color = value.colors[key];
            const inputId = `sb-color-${key}`;
            return (
              <div key={key} className="flex flex-col gap-1.5">
                <label htmlFor={inputId} className="text-xs font-medium tracking-[0.04em] text-dim">
                  {label}
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    id={inputId}
                    type="color"
                    value={color ?? template.colors.background ?? "#000000"}
                    onChange={(e) => set({ [key]: e.target.value })}
                    className={cn("w-10 shrink-0", color === null && "opacity-40")}
                  />
                  <span className="font-condensed text-[13px] text-muted uppercase">{color ?? "Video"}</span>
                </div>
                {key === "background" && (
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-soft">
                    <input
                      type="checkbox"
                      checked={color === null}
                      onChange={(e) =>
                        set({ background: e.target.checked ? null : (template.colors.background ?? "#0a0c10") })
                      }
                    />
                    Background video
                  </label>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-2.5">
          <Button variant="primary" className="h-11 flex-1 justify-center" disabled={!dirty} onClick={onSave}>
            Save &amp; put on air
          </Button>
          <Button
            variant="ghost"
            className="h-11"
            onClick={() => onChange({ template: template.id, colors: { ...template.colors } })}
          >
            Reset colours
          </Button>
          <Button variant="ghost" className="h-11" disabled={!dirty} onClick={onDiscard}>
            Discard
          </Button>
        </div>
        <Hint>
          The preview shows your changes. The scoreboard on air changes only when you save. Reset colours goes back to
          the template's own colours.
        </Hint>
      </PanelBody>
    </Panel>
  );
}
