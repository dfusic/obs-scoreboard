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
 * The player `delta` steps from `currentId` (previous = -1, next = +1), stopping at
 * either end. Starts from the first player when `currentId` isn't in the lineup.
 */
export function stepLineup(ids: string[], currentId: string | null, delta: number): string | null {
  if (ids.length === 0) return null;
  const index = currentId === null ? -1 : ids.indexOf(currentId);
  if (index === -1) return ids[0];
  return ids[Math.max(0, Math.min(ids.length - 1, index + delta))];
}
