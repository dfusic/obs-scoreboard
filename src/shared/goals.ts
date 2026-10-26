import type { GoalEvent, Side } from "./types";

/**
 * The goal list with `playerId` set as the scorer of the side's latest goal (the scorer
 * is picked after the goal, once the announcer names them). Unchanged if the side has
 * no goal. Pure; works from the caller's snapshot so it needs no server read.
 */
export function withLastScorer(goals: GoalEvent[], side: Side, playerId: string | null): GoalEvent[] {
  const lastIndex = goals.map((g) => g.side).lastIndexOf(side);
  if (lastIndex === -1) return goals;
  return goals.map((g, i) => (i === lastIndex ? { ...g, playerId } : g));
}
