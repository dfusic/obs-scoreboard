import { describe, expect, it } from "vitest";
import { idsByTier, placeSponsor, stepSponsor } from "./sponsorOrder";

const byTier = { main: ["m1", "m2", "m3"], partner: ["p1", "p2"] };

describe("placeSponsor", () => {
  it("drops before the target when dragging up", () => {
    expect(placeSponsor(byTier, "m3", "main", "m1")).toEqual(["m3", "m1", "m2", "p1", "p2"]);
  });
  it("drops after the target when dragging down within a tier", () => {
    expect(placeSponsor(byTier, "m1", "main", "m2")).toEqual(["m2", "m1", "m3", "p1", "p2"]);
  });
  it("promotes a partner before the target main sponsor", () => {
    expect(placeSponsor(byTier, "p2", "main", "m2")).toEqual(["m1", "p2", "m2", "m3", "p1"]);
  });
  it("appends to the tier without a target", () => {
    expect(placeSponsor(byTier, "m1", "partner", null)).toEqual(["m2", "m3", "p1", "p2", "m1"]);
  });
});

describe("stepSponsor", () => {
  it("swaps within the tier", () => {
    expect(stepSponsor(byTier, "p2", -1)).toEqual(["m1", "m2", "m3", "p2", "p1"]);
    expect(stepSponsor(byTier, "m1", 1)).toEqual(["m2", "m1", "m3", "p1", "p2"]);
  });
  it("stops at the ends of the tier", () => {
    expect(stepSponsor(byTier, "p1", -1)).toBeNull();
    expect(stepSponsor(byTier, "m3", 1)).toBeNull();
  });
});

describe("idsByTier", () => {
  it("splits the list by tier in list order, hidden sponsors included", () => {
    const s = (id: string, tier: "main" | "partner", hidden = false) => ({ id, name: id, logo: null, tier, order: 0, hidden });
    expect(idsByTier([s("p1", "partner"), s("m1", "main", true), s("p2", "partner", true), s("m2", "main")])).toEqual({
      main: ["m1", "m2"],
      partner: ["p1", "p2"],
    });
    expect(idsByTier([])).toEqual({ main: [], partner: [] });
  });
});

describe("placeSponsor edge cases", () => {
  it("drops onto the next tile to swap with it", () => {
    expect(placeSponsor(byTier, "m2", "main", "m3")).toEqual(["m1", "m3", "m2", "p1", "p2"]);
  });
  it("demotes a main sponsor before the target partner", () => {
    expect(placeSponsor(byTier, "m1", "partner", "p2")).toEqual(["m2", "m3", "p1", "m1", "p2"]);
  });
  it("moves to the end of its own tier without a target", () => {
    expect(placeSponsor(byTier, "m1", "main", null)).toEqual(["m2", "m3", "m1", "p1", "p2"]);
  });
  it("appends when the target is in the other tier or unknown", () => {
    expect(placeSponsor(byTier, "m1", "partner", "m3")).toEqual(["m2", "m3", "p1", "p2", "m1"]);
    expect(placeSponsor(byTier, "p1", "partner", "nope")).toEqual(["m1", "m2", "m3", "p2", "p1"]);
  });
  it("moves into an empty tier", () => {
    expect(placeSponsor({ main: [], partner: ["p1", "p2"] }, "p2", "main", null)).toEqual(["p2", "p1"]);
  });
  it("keeps every id exactly once", () => {
    const all = [...byTier.main, ...byTier.partner];
    for (const id of all) {
      for (const tier of ["main", "partner"] as const) {
        for (const target of [null, ...all]) {
          if (target === id) continue;
          expect([...placeSponsor(byTier, id, tier, target)].sort()).toEqual([...all].sort());
        }
      }
    }
  });
});

describe("stepSponsor edge cases", () => {
  it("is null for an unknown id and for a tier of one", () => {
    expect(stepSponsor(byTier, "nope", 1)).toBeNull();
    expect(stepSponsor({ main: ["m1"], partner: ["p1"] }, "m1", 1)).toBeNull();
  });
});
