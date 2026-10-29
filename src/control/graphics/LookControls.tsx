import { matchingScheme, sameColors, theme } from "@shared/themes";
import { transition } from "@shared/transitions";
import type { GraphicsSettings, SceneType } from "@shared/types";
import { useRef, useState, type ReactNode } from "react";
import { ScenePreview } from "../ScenePreview";
import { Button, cn, Dialog, Hint, Popover, Spacer } from "../ui";
import { useGraphicsDraft, useShownData } from "./draftContext";
import { ChangeDot, changeState, type ChangeState } from "./status";
import { LookColors, SchemeOptions, SchemeSwatches, ThemeOptions, ThemeThumb, TransitionOptions } from "./ThemePanels";

/** The look as shown, with its edit function and each part's change state. */
function useLook() {
  const draft = useGraphicsDraft();
  const shown = draft.shown.graphics;
  const saved = draft.saved.graphics;
  const onAir = draft.onAir.graphics;
  const colorState: ChangeState = !sameColors(shown.colors, saved.colors)
    ? "unsaved"
    : !sameColors(saved.colors, onAir.colors)
      ? "saved"
      : null;
  return {
    draft,
    value: shown,
    onChange: (next: GraphicsSettings) => draft.edit({ graphics: next, scenes: {} }),
    states: {
      theme: changeState(shown.theme, saved.theme, onAir.theme),
      colors: colorState,
      transition: changeState(shown.transition, saved.transition, onAir.transition),
    },
  };
}

/** A compact picker button in the look bar, opening its options in a popover. */
function LookPick({
  label,
  state,
  current,
  wide,
  children,
}: {
  label: string;
  state: ChangeState;
  current: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-12 items-center gap-2.5 rounded-md border border-line-strong bg-control px-3 text-left font-sans normal-case tracking-normal hover:border-line-hover hover:opacity-100",
          open && "border-accent",
        )}
      >
        <span className="flex flex-col leading-tight">
          <span className="flex items-center gap-1.5 text-[10px] font-medium tracking-[0.06em] text-dim uppercase">
            {label} <ChangeDot state={state} />
          </span>
          <span className="flex items-center gap-2 text-[13px] text-fg">{current}</span>
        </span>
        <span className="text-xs text-dim" aria-hidden="true">
          ▾
        </span>
      </button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        ignore={triggerRef}
        label={label}
        className={cn("top-full left-0 mt-1.5 w-[min(560px,calc(100vw-32px))]", wide && "w-[min(640px,calc(100vw-32px))]")}
      >
        {children}
      </Popover>
    </div>
  );
}

/**
 * "Look · all scenes": the theme, colour scheme and transition as compact pickers, and
 * Edit look for the single colours. Everything edits the unsaved draft. `previewScene` is
 * the scene the transition picker's preview plays onto.
 */
export function LookBar({ previewScene, onEditLook }: { previewScene: SceneType; onEditLook: () => void }) {
  const { value, onChange, states } = useLook();
  const data = useShownData();
  const [replay, setReplay] = useState(0);
  const t = theme(value.theme);
  const scheme = matchingScheme(value.colors);

  return (
    <section aria-label="Look, all scenes" className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-panel px-4 py-3">
      <div className="flex flex-col leading-tight">
        <span className="font-condensed text-[13px] font-bold tracking-[0.1em] text-soft uppercase">Look</span>
        <span className="text-[11px] text-dim">All scenes</span>
      </div>
      <LookPick
        label="Theme"
        state={states.theme}
        current={
          <>
            <span className="block h-5 w-9 overflow-hidden rounded-sm border border-line-strong">
              <ThemeThumb themeId={t.id} colors={value.colors} />
            </span>
            {t.name}
          </>
        }
      >
        <ThemeOptions value={value} onChange={onChange} />
      </LookPick>
      <LookPick
        label="Colour scheme"
        state={states.colors}
        current={
          <>
            <SchemeSwatches colors={value.colors} />
            {scheme?.name ?? "Custom"}
          </>
        }
        wide
      >
        <SchemeOptions value={value} onChange={onChange} />
      </LookPick>
      <LookPick label="Transition" state={states.transition} current={transition(value.transition).name}>
        <ScenePreview className="rounded-md" data={data} scene={previewScene} replay={replay} />
        <TransitionOptions value={value} onChange={onChange} onReplay={() => setReplay((n) => n + 1)} />
      </LookPick>
      <Spacer />
      <Button variant="ghost" className="h-10" onClick={onEditLook}>
        Edit look
      </Button>
    </section>
  );
}

/**
 * The full look editor in a dialog: a preview of `scene` with the look as edited, theme,
 * colour scheme, transition and the single colours. Edits stay unsaved until Save.
 */
export function LookDialog({ open, onClose, scene }: { open: boolean; onClose: () => void; scene: SceneType }) {
  const { draft, value, onChange, states } = useLook();
  const data = useShownData();
  const [replay, setReplay] = useState(0);
  const heading = "flex items-center gap-1.5 font-condensed text-[11px] font-bold tracking-[0.12em] text-dim uppercase";

  return (
    <Dialog open={open} onClose={onClose} title="Look · all scenes" className="w-[min(1120px,calc(100vw-32px))]">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5 p-[18px] max-[900px]:grid-cols-[minmax(0,1fr)]">
        <div className="flex flex-col gap-2.5 self-start min-[901px]:sticky min-[901px]:top-0">
          <ScenePreview data={data} scene={scene} replay={replay} />
          <Hint>Preview only · not on air.</Hint>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs text-soft">
              {draft.unsaved ? `Unsaved: ${draft.unsavedSummary}` : draft.pending ? `Saved, not on air: ${draft.summary}` : "Everything is on air"}
            </span>
            <Spacer />
            <Button variant="ghost" disabled={!draft.unsaved} onClick={draft.save}>
              Save
            </Button>
            <Button variant="primary" className="h-9" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <section className="flex flex-col gap-2.5">
            <h2 className={cn("m-0", heading)}>
              Theme <ChangeDot state={states.theme} />
            </h2>
            <ThemeOptions value={value} onChange={onChange} />
          </section>
          <section className="flex flex-col gap-2.5">
            <h2 className={cn("m-0", heading)}>
              Colour scheme <ChangeDot state={states.colors} />
            </h2>
            <SchemeOptions value={value} onChange={onChange} />
          </section>
          <section className="flex flex-col gap-2.5">
            <h2 className={cn("m-0", heading)}>
              Colours <ChangeDot state={states.colors} />
            </h2>
            <LookColors value={value} onChange={onChange} />
          </section>
          <section className="flex flex-col gap-2.5">
            <h2 className={cn("m-0", heading)}>
              Transition <ChangeDot state={states.transition} />
            </h2>
            <TransitionOptions value={value} onChange={onChange} onReplay={() => setReplay((n) => n + 1)} />
          </section>
        </div>
      </div>
    </Dialog>
  );
}
