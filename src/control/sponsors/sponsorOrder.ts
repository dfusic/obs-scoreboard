import type { Sponsor, SponsorTier } from "@shared/types";

/** The full list split by tier, each in list order (hidden ones included). */
export function idsByTier(sponsors: readonly Sponsor[]): Record<SponsorTier, string[]> {
  return {
    main: sponsors.filter((s) => s.tier === "main").map((s) => s.id),
    partner: sponsors.filter((s) => s.tier !== "main").map((s) => s.id),
  };
}

/**
 * Where a sponsor lands when moved into `tier`: before `targetId` (after it when dragged down
 * within the same tier, so dragging onto the next tile works), or at the end when `targetId`
 * is null. Returns the new full order (main first, then partners) for `reorder()`.
 */
export function placeSponsor(
  byTier: Record<SponsorTier, string[]>,
  id: string,
  tier: SponsorTier,
  targetId: string | null,
): string[] {
  const fromTier: SponsorTier | null = byTier.main.includes(id) ? "main" : byTier.partner.includes(id) ? "partner" : null;
  const next: Record<SponsorTier, string[]> = {
    main: byTier.main.filter((x) => x !== id),
    partner: byTier.partner.filter((x) => x !== id),
  };
  const list = next[tier];
  const at = targetId === null ? -1 : list.indexOf(targetId);
  if (at < 0) list.push(id);
  else {
    const old = byTier[tier];
    const after = fromTier === tier && old.indexOf(id) < old.indexOf(targetId!);
    list.splice(after ? at + 1 : at, 0, id);
  }
  return [...next.main, ...next.partner];
}

/** Swaps a sponsor with its neighbour within its tier; null at either end. */
export function stepSponsor(byTier: Record<SponsorTier, string[]>, id: string, by: -1 | 1): string[] | null {
  const tier: SponsorTier = byTier.main.includes(id) ? "main" : "partner";
  const list = [...byTier[tier]];
  const at = list.indexOf(id);
  const to = at + by;
  if (at < 0 || to < 0 || to >= list.length) return null;
  [list[at], list[to]] = [list[to], list[at]];
  return tier === "main" ? [...list, ...byTier.partner] : [...byTier.main, ...list];
}
