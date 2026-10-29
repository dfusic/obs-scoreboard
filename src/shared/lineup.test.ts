import { describe, expect, it } from "vitest";
import { lineupLabels, moveInLineup, resolveLineup, stepIntro, toggleInLineup } from "./lineup";
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

describe("lineupLabels", () => {
  it("shows each player by surname, in order", () => {
    expect(lineupLabels(["Adrijan Coha", "Marko Horvat", "Ana Marija Babić"])).toEqual(["Coha", "Horvat", "Babić"]);
  });

  it("adds the first initial when a surname is shared (case-insensitive), leaving others alone", () => {
    expect(lineupLabels(["Ivan Kovač", "Luka Horvat", "Petar KOVAČ"])).toEqual(["I. Kovač", "Horvat", "P. KOVAČ"]);
  });

  it("falls back to the full name when the initials clash too", () => {
    expect(lineupLabels(["Ivan Kovač", "Ivo Kovač", "Petar Kovač"])).toEqual(["Ivan Kovač", "Ivo Kovač", "P. Kovač"]);
  });

  it("keeps one-word names and tidies whitespace", () => {
    expect(lineupLabels(["Kovač", "  Ivan   Kovač ", "Pelé", ""])).toEqual(["Kovač", "I. Kovač", "Pelé", ""]);
  });

  it("uses the whole first letter of an accented first name", () => {
    expect(lineupLabels(["Đuro Babić", "Ante Babić"])).toEqual(["Đ. Babić", "A. Babić"]);
  });

  it("takes the initial of a two-word first name's first word, and the full name when that clashes", () => {
    expect(lineupLabels(["Ana Marija Babić", "Luka Babić"])).toEqual(["A. Babić", "L. Babić"]);
    expect(lineupLabels(["Ana Marija Babić", "Ante Babić"])).toEqual(["Ana Marija Babić", "Ante Babić"]);
  });

  it("keeps two players with the same full name as full names", () => {
    expect(lineupLabels(["Ivan Kovač", "Ivan Kovač", "Luka Horvat"])).toEqual(["Ivan Kovač", "Ivan Kovač", "Horvat"]);
  });

  it("returns an empty list for no players", () => {
    expect(lineupLabels([])).toEqual([]);
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
