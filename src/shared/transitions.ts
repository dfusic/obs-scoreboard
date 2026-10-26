/**
 * Scene transitions, a global graphics setting (settings/graphics `transition`). Every
 * change of scene on the output page plays the chosen one; the overlay draws it
 * (overlay/Transition.tsx and overlay.css) from the values computed here.
 *
 * Kinds:
 * - cut: the new scene at once.
 * - fade: the old scene fades out while the new one fades in.
 * - popup: the old scene shrinks away, then the new one pops in with an overshoot.
 * - cover: a curtain in the colour scheme's colours closes over the old scene, holds with
 *   the team logo, and opens on the new one. The scene changes while fully covered.
 *
 * Everything runs on a 30 fps frame clock: progress only moves in whole frames of
 * 1/30 s, so a transition looks the same on any screen and frame rate. To add a
 * transition, add it to TRANSITIONS; a cover also needs markup in Transition.tsx and CSS.
 */
export type TransitionKind = "cut" | "fade" | "popup" | "cover";

export interface Transition {
  id: string;
  name: string;
  kind: TransitionKind;
}

export const TRANSITIONS: readonly Transition[] = [
  { id: "cut", name: "Cut", kind: "cut" },
  { id: "fade", name: "Fade", kind: "fade" },
  { id: "popup", name: "Popup", kind: "popup" },
  // One panel sweeping across, led in (and trailed out) by a second colour.
  { id: "wipe", name: "Wipe", kind: "cover" },
  // Horizontal bands wiping across one after the other.
  { id: "staggerWipe", name: "Stagger wipe", kind: "cover" },
  // Vertical slats, each wiping across.
  { id: "blinds", name: "Blinds", kind: "cover" },
  // Horizontal slats closing top to bottom, then opening.
  { id: "shutter", name: "Shutter", kind: "cover" },
  // Two halves meeting in the middle, then sliding back out.
  { id: "doors", name: "Doors", kind: "cover" },
  // A circle closing on the centre, then opening from it.
  { id: "iris", name: "Iris", kind: "cover" },
  // A grid of squares popping on in random order, then off.
  { id: "pixels", name: "Pixels", kind: "cover" },
];

export const DEFAULT_TRANSITION = "fade";

/** The transition with this id; the default (Fade) for an unknown id. */
export function transition(id: unknown): Transition {
  return TRANSITIONS.find((t) => t.id === id) ?? TRANSITIONS.find((t) => t.id === DEFAULT_TRANSITION)!;
}

export const FPS = 30;

/** Frame lengths (at 30 fps). */
export const FRAMES = {
  fade: 15,
  popupOut: 7,
  popupIn: 15,
  cover: 14,
  hold: 8,
  reveal: 14,
} as const;

/** How many frames a transition of this kind lasts. */
export function totalFrames(kind: TransitionKind): number {
  if (kind === "fade") return FRAMES.fade;
  if (kind === "popup") return FRAMES.popupOut + FRAMES.popupIn;
  if (kind === "cover") return FRAMES.cover + FRAMES.hold + FRAMES.reveal;
  return 0;
}

/** The 30 fps frame a transition started at `startMs` is on at `nowMs`. */
export function frameAt(startMs: number, nowMs: number): number {
  // The epsilon keeps exact frame boundaries (e.g. 1 s = frame 30) from rounding down.
  return Math.max(0, Math.floor(((nowMs - startMs) * FPS) / 1000 + 1e-9));
}

/** Everything the overlay needs to draw one frame. All values are 0..1 unless noted. */
export interface TransitionFrame {
  /** The new scene has replaced the old one (cover: from full cover on; popup: once the old one is gone). */
  swapped: boolean;
  done: boolean;
  /** How far the old scene has left (fade, popup). */
  out: number;
  /** How far the new scene has arrived, eased (popup overshoots past 1). */
  in: number;
  /** `in` without easing. */
  inLinear: number;
  /** How far the curtain has closed. */
  cover: number;
  /** How far the curtain has opened again. */
  reveal: number;
  /** The logo on the curtain: shows as it closes, hides as it opens. */
  logo: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const easeIn = (t: number) => t ** 3;
/** Ease out with an overshoot past 1 before settling (popup). */
const backOut = (t: number) => (t <= 0 ? 0 : 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2);

const STILL = { out: 0, in: 0, inLinear: 0, cover: 0, reveal: 0, logo: 0 };

/** The transition's state at a frame. Pure. */
export function transitionFrame(kind: TransitionKind, frame: number): TransitionFrame {
  const f = Math.max(0, frame);
  switch (kind) {
    case "cut":
      return { ...STILL, in: 1, inLinear: 1, swapped: true, done: true };
    case "fade": {
      const t = clamp01(f / FRAMES.fade);
      return { ...STILL, out: easeInOut(t), in: easeInOut(t), inLinear: t, swapped: true, done: t === 1 };
    }
    case "popup": {
      const t1 = clamp01(f / FRAMES.popupOut);
      const t2 = clamp01((f - FRAMES.popupOut) / FRAMES.popupIn);
      return { ...STILL, out: easeIn(t1), in: backOut(t2), inLinear: t2, swapped: t1 === 1, done: t2 === 1 };
    }
    case "cover": {
      const a = clamp01(f / FRAMES.cover);
      const b = clamp01((f - FRAMES.cover - FRAMES.hold) / FRAMES.reveal);
      return {
        ...STILL,
        cover: easeInOut(a),
        reveal: easeInOut(b),
        logo: clamp01((a - 0.6) / 0.4) * (1 - clamp01(b / 0.4)),
        swapped: a === 1,
        done: b === 1,
      };
    }
  }
}
