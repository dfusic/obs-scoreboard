import { describe, expect, it } from "vitest";
import { activeScene, goalMinute, remainingMs, takeScene } from "./program";

describe("takeScene / activeScene", () => {
  it("stays on air without a duration", () => {
    const program = takeScene("welcome", null, 1_000);
    expect(activeScene(program, 1_000_000)).toBe("welcome");
    expect(remainingMs(program, 1_000_000)).toBeNull();
  });

  it("returns to the scoreboard after its duration", () => {
    const program = takeScene("goal", 15_000, 1_000, { side: "home", playerId: "p1" });
    expect(activeScene(program, 15_999)).toBe("goal");
    expect(remainingMs(program, 6_000)).toBe(10_000);
    expect(activeScene(program, 16_000)).toBe("scoreboard");
    expect(remainingMs(program, 20_000)).toBe(0);
  });

  it("keeps the target side and player", () => {
    expect(takeScene("playerCard", 10_000, 0, { side: "away", playerId: "p9" })).toMatchObject({
      side: "away",
      playerId: "p9",
    });
  });

  it("never times out the scoreboard", () => {
    expect(takeScene("scoreboard", 5_000, 0).autoReturnMs).toBeNull();
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
