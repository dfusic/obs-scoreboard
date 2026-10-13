import { describe, expect, it } from "vitest";
import { moveInLineup, resolveLineup, stepLineup, toggleInLineup } from "./lineup";
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

describe("stepLineup", () => {
  const ids = ["a", "b", "c"];

  it("steps to the next and previous player", () => {
    expect(stepLineup(ids, "a", 1)).toBe("b");
    expect(stepLineup(ids, "c", -1)).toBe("b");
  });

  it("stops at either end", () => {
    expect(stepLineup(ids, "c", 1)).toBe("c");
    expect(stepLineup(ids, "a", -1)).toBe("a");
  });

  it("starts from the first player when there is no current one", () => {
    expect(stepLineup(ids, null, 1)).toBe("a");
    expect(stepLineup(ids, "removed", 1)).toBe("a");
    expect(stepLineup([], null, 1)).toBeNull();
  });
});
