import { FPS, frameAt } from "./transitions";
import type { Sponsor, SponsorTier } from "./types";

/**
 * The Sponsors scene's pure helpers. Keep them pure; pass Date.now().
 */

/** Sponsor list order: by `order`, then name (ties from bulk adds on two devices). */
export function compareSponsors(a: Sponsor, b: Sponsor): number {
  return a.order - b.order || a.name.localeCompare(b.name);
}

/**
 * What the scene shows: sponsors with a logo that aren't hidden (it shows images only, never names), main
 * sponsors first, each tier in list order.
 */
export function sponsorsByTier(sponsors: readonly Sponsor[]): { main: Sponsor[]; partners: Sponsor[] } {
  const sorted = sponsors.filter((s) => s.logo && !s.hidden).sort(compareSponsors);
  return { main: sorted.filter((s) => s.tier === "main"), partners: sorted.filter((s) => s.tier !== "main") };
}

/** The `order` for sponsors added after the existing ones. */
export function nextSponsorOrder(sponsors: readonly Sponsor[]): number {
  return sponsors.reduce((max, s) => Math.max(max, s.order + 1), 0);
}

export interface SponsorWrite {
  id: string;
  fields: { order?: number; tier?: SponsorTier };
}

/**
 * The writes that save a new list order (each id gets its position in `orderedIds`) and,
 * with `moved`, that sponsor's new tier. Only what differs from `current` (the list as the
 * caller sees it) is written; ids missing from `current` are always written. Without
 * `current`, every id gets its order.
 */
export function sponsorOrderWrites(
  orderedIds: readonly string[],
  current?: readonly Sponsor[],
  moved?: { id: string; tier: SponsorTier },
): SponsorWrite[] {
  const known = new Map(current?.map((s) => [s.id, s]));
  const writes: SponsorWrite[] = [];
  orderedIds.forEach((id, order) => {
    const was = known.get(id);
    const fields: SponsorWrite["fields"] = {};
    if (!was || was.order !== order) fields.order = order;
    if (moved?.id === id && (!was || was.tier !== moved.tier)) fields.tier = moved.tier;
    if (fields.order !== undefined || fields.tier !== undefined) writes.push({ id, fields });
  });
  if (moved && !orderedIds.includes(moved.id)) {
    const was = known.get(moved.id);
    if (!was || was.tier !== moved.tier) writes.push({ id: moved.id, fields: { tier: moved.tier } });
  }
  return writes;
}

export const MIN_SECONDS_PER_SPONSOR = 2;
export const MAX_SECONDS_PER_SPONSOR = 60;
export const DEFAULT_SECONDS_PER_SPONSOR = 6;

/** A valid seconds-per-sponsor: whole seconds within the limits, else the default. */
export function secondsPerSponsor(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_SECONDS_PER_SPONSOR;
  return Math.min(MAX_SECONDS_PER_SPONSOR, Math.max(MIN_SECONDS_PER_SPONSOR, Math.round(value)));
}

/** Frames (at FPS) each logo fades in at the start of its turn and out at the end. */
export const SPONSOR_FADE_FRAMES = 12;

export interface SponsorSlide {
  /** Index of the sponsor shown (0 when there are none). */
  index: number;
  /** 0..1, in whole frames: fades in at the start of the turn and out at the end. */
  opacity: number;
  /** ms until the opacity next changes; Infinity when it never does. */
  nextChangeMs: number;
}

/**
 * "One at a time": which sponsor is up, derived from when the scene was taken and the
 * time, so every output window shows the same one and a reload doesn't restart the
 * rotation. Time moves in whole 1/FPS frames, like the transitions.
 */
export function sponsorSlide(count: number, startedAtMs: number, nowMs: number, seconds: number): SponsorSlide {
  if (count <= 1) return { index: 0, opacity: 1, nextChangeMs: Infinity };
  const slotFrames = secondsPerSponsor(seconds) * FPS;
  const frame = frameAt(startedAtMs, nowMs);
  const index = Math.floor(frame / slotFrames) % count;
  const inSlot = frame % slotFrames;
  const fade = SPONSOR_FADE_FRAMES;
  const fromEnd = slotFrames - 1 - inSlot;
  // The first sponsor is up at once: the scene transition already brings it in, and an
  // output clock behind the control's (frame clamped to 0) still shows it.
  const fadingIn = frame >= slotFrames && inSlot < fade;
  // Blank on the last frame of a turn and the first of the next, fully up in between.
  const opacity = Math.min(1, fadingIn ? inSlot / fade : 1, fromEnd / fade);
  // While fading, the next frame changes it; while solid, the start of the fade-out does.
  const framesToChange = fadingIn || fromEnd < fade ? 1 : fromEnd - fade + 1;
  const nextChangeMs = ((frame + framesToChange) * 1000) / FPS - Math.max(0, nowMs - startedAtMs);
  return { index, opacity, nextChangeMs: Math.max(1, nextChangeMs) };
}

/**
 * Columns for `count` logo boxes in an area `areaRatio` times as wide as it is tall, so
 * each logo gets the largest box of `boxRatio` (width / height) that fits. Fewer columns
 * win a tie (bigger rows read better than a sparse last row).
 */
export function gridColumns(count: number, areaRatio: number, boxRatio = 2): number {
  let best = 1;
  let bestSize = 0;
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    // Height of a boxRatio box that fits in one cell (area height = 1).
    const size = Math.min(areaRatio / cols / boxRatio, 1 / rows);
    if (size > bestSize + 1e-9) {
      best = cols;
      bestSize = size;
    }
  }
  return best;
}
