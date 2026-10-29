import type { Player } from "./types";

/**
 * Pure helpers for a match lineup: an ordered list of player ids ticked as playing.
 * Ids of players that were deleted since are skipped, not errors.
 */

/** The lineup's players in order, skipping ids that no longer exist. */
export function resolveLineup(ids: string[], players: Map<string, Player>): Player[] {
  return ids.map((id) => players.get(id)).filter((p): p is Player => p !== undefined);
}

/** Ticks a player (appended at the end) or unticks them. */
export function toggleInLineup(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/** Moves the item at `from` to index `to` (drag and drop / up-down buttons). */
export function moveInLineup(ids: string[], from: number, to: number): string[] {
  if (from < 0 || from >= ids.length) return ids;
  const target = Math.max(0, Math.min(ids.length - 1, to));
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

/**
 * Lineup scene labels: each player by surname (the last word of the name), like a team
 * sheet. Players sharing a surname get their first initial ("I. Kovač"); if that still
 * clashes (Ivan and Ivo Kovač), their full name. Surnames compare case-insensitively.
 * Casing is left to the display (the overlay shows them uppercase).
 */
export function lineupLabels(names: string[]): string[] {
  const split = names.map((name) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    const first = parts.slice(0, -1).join(" ");
    return { full: parts.join(" "), first, last, key: last.toLocaleUpperCase() };
  });
  const count = (keys: string[]) => keys.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<string, number>());
  const surnames = count(split.map((s) => s.key));
  const initialOf = (s: (typeof split)[number]) => (s.first ? `${Array.from(s.first)[0]}. ${s.last}` : s.last);
  const initials = count(split.map((s) => initialOf(s).toLocaleUpperCase()));
  return split.map((s) => {
    if (!s.first || (surnames.get(s.key) ?? 0) < 2) return s.last;
    const initial = initialOf(s);
    return (initials.get(initial.toLocaleUpperCase()) ?? 0) < 2 ? initial : s.full;
  });
}

/**
 * Player intro: the step `delta` away from `currentId` (previous = -1, next = +1). The
 * intro opens on the club logo (null), before the first player; it stops at either end.
 * A player no longer in the lineup counts as the logo.
 */
export function stepIntro(ids: string[], currentId: string | null, delta: number): string | null {
  // Position 0 is the logo, 1..n the players.
  const index = currentId === null ? 0 : ids.indexOf(currentId) + 1;
  const next = Math.max(0, Math.min(ids.length, index + delta));
  return next === 0 ? null : ids[next - 1];
}
