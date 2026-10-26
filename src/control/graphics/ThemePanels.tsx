import {
  COLOR_SCHEMES,
  matchingScheme,
  sameColors,
  theme,
  THEME_COLORS,
  themeColors,
  THEMES,
  type ThemeId,
} from "@shared/themes";
import { transition, TRANSITIONS } from "@shared/transitions";
import type { GraphicsSettings, SchemeColors } from "@shared/types";
import type { ReactNode } from "react";
import { Button, cn, Hint, Panel, PanelBody, PanelTitle, Spacer } from "../ui";

/** Stand-in for the background video in thumbnails. */
export const VIDEO_THUMB_BG = "radial-gradient(ellipse at 30% 60%, #3a0808 0%, #1a0303 40%, #000 100%)";

const thumbText = "font-condensed font-black leading-none tabular-nums";

/** Marks a panel's options as global (every scene) or as the selected scene's own. */
export function ScopeTag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-line-strong px-2 py-0.5 text-[10px] tracking-[0.08em] text-muted">
      {children}
    </span>
  );
}

/** A miniature of the theme's scoreboard in the given colours. */
function ThemeThumb({ themeId, colors }: { themeId: ThemeId; colors: SchemeColors }) {
  const background = colors.background ?? VIDEO_THUMB_BG;
  if (themeId === "classic") {
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
  if (themeId === "semafor") {
    return (
      <div
        className="relative size-full"
        style={{
          background: `repeating-linear-gradient(-35deg, ${colors.accent} 0 9px, transparent 9px 18px), ${background}`,
        }}
      >
        <div className="absolute inset-x-[7%] inset-y-[9%] flex flex-col bg-black/75 backdrop-blur-[3px]">
          <div className="flex flex-1 items-center justify-around border-b border-white/80">
            <span className="font-condensed text-[8px] font-bold uppercase" style={{ color: colors.names }}>
              Home
            </span>
            <span className={cn(thumbText, "text-[13px]")} style={{ color: colors.timer }}>
              45:00
            </span>
            <span className="font-condensed text-[8px] font-bold uppercase" style={{ color: colors.names }}>
              Away
            </span>
          </div>
          <div className="flex flex-[2] items-center justify-around">
            <span className="size-5 rounded-full bg-white/20" />
            <span className={cn(thumbText, "text-[24px]")} style={{ color: colors.score }}>
              2:1
            </span>
            <span className="size-5 rounded-full bg-white/20" />
          </div>
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

/** One option in a picker grid: its thumbnail and name, with an optional extra under the name. */
export function PickerOption({
  name,
  selected,
  onPick,
  extra,
  children,
}: {
  name: string;
  selected: boolean;
  onPick: () => void;
  extra?: ReactNode;
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
      <span className={cn("flex items-center gap-2 self-center", selected && "text-fg")}>
        {name}
        {extra}
      </span>
    </button>
  );
}

const pickerGrid = "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5";

/**
 * The theme grid, each shown in the current colours. A theme is the design of every
 * scene; picking one keeps the colours, so the colour scheme carries over.
 */
export function ThemePicker({ value, onChange }: { value: GraphicsSettings; onChange: (next: GraphicsSettings) => void }) {
  return (
    <Panel>
      <PanelTitle>
        Theme
        <Spacer />
        <ScopeTag>All scenes</ScopeTag>
      </PanelTitle>
      <PanelBody>
        <div className={pickerGrid}>
          {THEMES.map((t) => (
            <PickerOption
              key={t.id}
              name={t.name}
              selected={t.id === value.theme}
              onPick={() => onChange({ ...value, theme: t.id })}
            >
              <ThemeThumb themeId={t.id} colors={value.colors} />
            </PickerOption>
          ))}
        </div>
        <Hint>The theme sets the design of every scene. Your colour scheme stays when you switch.</Hint>
      </PanelBody>
    </Panel>
  );
}

/** The scheme's colours as small dots: background, accent and the scenes' highlight. */
function SchemeSwatches({ colors }: { colors: SchemeColors }) {
  return (
    <span className="flex gap-1">
      {[colors.background, colors.accent, colors.highlight].map((color, i) => (
        <span
          key={i}
          className="size-2.5 rounded-full border border-white/20"
          style={{ background: color ?? VIDEO_THUMB_BG }}
        />
      ))}
    </span>
  );
}

/** The colour scheme grid, each shown on the chosen theme. Picking one replaces all colours. */
export function ColorSchemePicker({
  value,
  onChange,
}: {
  value: GraphicsSettings;
  onChange: (next: GraphicsSettings) => void;
}) {
  return (
    <Panel>
      <PanelTitle>
        Colour scheme
        <Spacer />
        <ScopeTag>All scenes</ScopeTag>
      </PanelTitle>
      <PanelBody>
        <div className={pickerGrid}>
          {COLOR_SCHEMES.map((s) => (
            <PickerOption
              key={s.id}
              name={s.name}
              selected={sameColors(s.colors, value.colors)}
              onPick={() => onChange({ ...value, colors: { ...s.colors } })}
              extra={<SchemeSwatches colors={s.colors} />}
            >
              <ThemeThumb themeId={theme(value.theme).id} colors={s.colors} />
            </PickerOption>
          ))}
        </div>
        <Hint>The colour scheme colours every scene: the scoreboard, and the titles and accents of the others.</Hint>
      </PanelBody>
    </Panel>
  );
}

/**
 * The look of every scene: the chosen theme and colour scheme, the single colours, and
 * saving. Everything here is a draft shown only in the preview until saved, so the look
 * can be tried out while on air.
 */
export function LookPanel({
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
  const t = theme(value.theme);
  const defaults = themeColors(t);
  const scheme = matchingScheme(value.colors);
  const set = (colors: Partial<SchemeColors>) => onChange({ ...value, colors: { ...value.colors, ...colors } });

  return (
    <Panel>
      <PanelTitle>
        Look
        <Spacer />
        {dirty && <span className="tracking-[0.08em] text-warning normal-case">Unsaved</span>}
        <ScopeTag>All scenes</ScopeTag>
      </PanelTitle>
      <PanelBody>
        <div className="text-[13px] text-soft">
          Theme <strong className="text-fg">{t.name}</strong> · Colours{" "}
          <strong className="text-fg">{scheme?.name ?? "Custom"}</strong> · Transition{" "}
          <strong className="text-fg">{transition(value.transition).name}</strong>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {THEME_COLORS[t.id].map(({ key, label }) => {
            const color = value.colors[key];
            const inputId = `look-color-${key}`;
            return (
              <div key={key} className="flex flex-col gap-1.5">
                <label htmlFor={inputId} className="text-xs font-medium tracking-[0.04em] text-dim">
                  {label}
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    id={inputId}
                    type="color"
                    value={color ?? defaults.background ?? "#000000"}
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
                      onChange={(e) => set({ background: e.target.checked ? null : (defaults.background ?? "#0a0c10") })}
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
          <Button variant="ghost" className="h-11" onClick={() => onChange({ ...value, colors: defaults })}>
            Reset colours
          </Button>
          <Button variant="ghost" className="h-11" disabled={!dirty} onClick={onDiscard}>
            Discard
          </Button>
        </div>
        <Hint>
          Theme and colours apply to every scene. The preview shows your changes on whichever scene you pick above; the
          output changes only when you save. Reset colours goes back to the theme's own colour scheme.
        </Hint>
      </PanelBody>
    </Panel>
  );
}

/**
 * The transition between scenes, part of the look (draft until saved). Picking one, or
 * Replay, plays it in the preview.
 */
export function TransitionPicker({
  value,
  onChange,
  onReplay,
}: {
  value: GraphicsSettings;
  onChange: (next: GraphicsSettings) => void;
  onReplay: () => void;
}) {
  return (
    <Panel>
      <PanelTitle>
        Transition
        <Spacer />
        <ScopeTag>All scenes</ScopeTag>
      </PanelTitle>
      <PanelBody>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-1.5">
          {TRANSITIONS.map((t) => (
            <Button
              key={t.id}
              variant="tab"
              aria-pressed={t.id === value.transition}
              className={cn("justify-center", t.id === value.transition && "border-accent bg-control-hover text-fg")}
              onClick={() => {
                onChange({ ...value, transition: t.id });
                onReplay();
              }}
            >
              {t.name}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <Hint>
            Plays whenever the output changes scene. Curtains use the colour scheme's colours and the team logo.
          </Hint>
          <Spacer />
          <Button variant="ghost" onClick={onReplay}>
            Replay
          </Button>
        </div>
      </PanelBody>
    </Panel>
  );
}
