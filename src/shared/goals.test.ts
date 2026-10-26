import { describe, expect, it } from "vitest";
import { withLastScorer } from "./goals";
import type { GoalEvent } from "./types";

const goals: GoalEvent[] = [
  { side: "home", playerId: null, elapsedMs: 60_000 },
  { side: "away", playerId: "a1", elapsedMs: 120_000 },
  { side: "home", playerId: null, elapsedMs: 180_000 },
  { side: "away", playerId: null, elapsedMs: 240_000 },
];

describe("withLastScorer", () => {
  it("sets the scorer of the side's latest goal only", () => {
    const next = withLastScorer(goals, "home", "h9");
    expect(next.map((g) => g.playerId)).toEqual([null, "a1", "h9", null]);
    expect(next[2].elapsedMs).toBe(180_000);
  });

  it("corrects a scorer picked by mistake, or clears it", () => {
    const picked = withLastScorer(goals, "away", "a2");
    expect(withLastScorer(picked, "away", "a3")[3].playerId).toBe("a3");
    expect(withLastScorer(picked, "away", null)[3].playerId).toBeNull();
  });

  it("leaves the list alone when the side hasn't scored", () => {
    const homeOnly = goals.filter((g) => g.side === "home");
    expect(withLastScorer(homeOnly, "away", "a1")).toBe(homeOnly);
  });

  it("doesn't mutate the input", () => {
    withLastScorer(goals, "home", "h9");
    expect(goals[2].playerId).toBeNull();
  });
});
