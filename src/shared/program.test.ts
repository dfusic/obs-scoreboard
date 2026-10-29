import { describe, expect, it } from "vitest";
import { goalMinute, programView, takeKey, takeScene, viewScene } from "./program";

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

describe("programView / takeKey", () => {
  it("changes with the scene or the side, not with the player or a re-take", () => {
    const home = takeScene("lineup", 1_000, { side: "home" });
    expect(programView(home)).not.toBe(programView(takeScene("lineup", 2_000, { side: "away" })));
    expect(programView(home)).not.toBe(programView(takeScene("halftime", 2_000)));
    expect(programView(home)).toBe(programView(takeScene("lineup", 2_000, { side: "home" })));
    // Player intro Prev/Next: same view, so no transition.
    const intro = takeScene("presentation", 1_000, { side: "home", playerId: "p1" });
    expect(programView(intro)).toBe(programView(takeScene("presentation", 2_000, { side: "home", playerId: "p2" })));
  });

  it("gives the view's scene back", () => {
    expect(viewScene(programView(takeScene("lineup", 0, { side: "away" })))).toBe("lineup");
    expect(viewScene(programView(takeScene("goal", 0)))).toBe("goal");
  });

  it("is new for every take", () => {
    const goal = takeScene("goal", 1_000);
    expect(takeKey(goal)).not.toBe(takeKey(takeScene("goal", 2_000)));
    expect(takeKey(goal)).toBe(takeKey(takeScene("goal", 1_000)));
    expect(takeKey(takeScene("lineup", 1_000, { side: "home" }))).not.toBe(takeKey(takeScene("lineup", 1_000, { side: "away" })));
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
