import { describe, expect, it } from "vitest";
import { moveInLineup, resolveLineup, stepIntro, toggleInLineup } from "./lineup";
import type { Player } from "./types";

const player = (id: string): Player => ({ id, teamId: "t", name: id.toUpperCase(), photo: null });

describe("resolveLineup", () => {
  it("keeps lineup order and skips deleted players", () => {
    const players = new Map(["a", "b", "c"].map((id) => [id, player(id)]));
    expect(resolveLineup(["c", "gone", "a"], players).map((p) => p.id)).toEqual(["c", "a"]);
  });
});

describe("toggleInLineup", () => {
  it("appends a newly ticked player and removes an unticked one", () => {
    expect(toggleInLineup(["a", "b"], "c")).toEqual(["a", "b", "c"]);
    expect(toggleInLineup(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });
});

describe("moveInLineup", () => {
  it("moves an item forward and back", () => {
    expect(moveInLineup(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveInLineup(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("clamps the target and ignores a bad source", () => {
    expect(moveInLineup(["a", "b", "c"], 0, 99)).toEqual(["b", "c", "a"]);
    expect(moveInLineup(["a", "b"], 5, 0)).toEqual(["a", "b"]);
  });
});

describe("stepIntro", () => {
  const ids = ["a", "b", "c"];

  it("goes from the club logo to the first player and back", () => {
    expect(stepIntro(ids, null, 1)).toBe("a");
    expect(stepIntro(ids, "a", -1)).toBeNull();
  });

  it("steps to the next and previous player", () => {
    expect(stepIntro(ids, "a", 1)).toBe("b");
    expect(stepIntro(ids, "c", -1)).toBe("b");
  });

  it("stops at either end", () => {
    expect(stepIntro(ids, "c", 1)).toBe("c");
    expect(stepIntro(ids, null, -1)).toBeNull();
  });

  it("treats a player no longer in the lineup as the logo, and an empty lineup as logo only", () => {
    expect(stepIntro(ids, "removed", 1)).toBe("a");
    expect(stepIntro([], null, 1)).toBeNull();
  });
});
