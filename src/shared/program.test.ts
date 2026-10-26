import { describe, expect, it } from "vitest";
import { goalMinute, takeScene } from "./program";

describe("takeScene", () => {
  it("puts the scene on air with its target, stamped with the take time", () => {
    expect(takeScene("playerCard", 1_000, { side: "away", playerId: "p9" })).toEqual({
      scene: "playerCard",
      side: "away",
      playerId: "p9",
      startedAtMs: 1_000,
    });
  });

  it("has no target by default", () => {
    expect(takeScene("goal", 0)).toEqual({ scene: "goal", side: null, playerId: null, startedAtMs: 0 });
  });
});

describe("goalMinute", () => {
  it("counts the running minute", () => {
    expect(goalMinute(0)).toBe(1);
    expect(goalMinute(59_999)).toBe(1);
    expect(goalMinute(60_000)).toBe(2);
    expect(goalMinute((44 * 60 + 30) * 1000)).toBe(45);
  });
});
