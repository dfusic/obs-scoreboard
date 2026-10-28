import { describe, expect, it } from "vitest";
import {
  DEFAULT_SECONDS_PER_SPONSOR,
  gridColumns,
  nextSponsorOrder,
  secondsPerSponsor,
  SPONSOR_FADE_FRAMES,
  sponsorSlide,
  sponsorsByTier,
  sponsorOrderWrites,
} from "./sponsors";
import { FPS } from "./transitions";
import type { Sponsor } from "./types";

const sponsor = (id: string, order: number, tier: Sponsor["tier"] = "partner"): Sponsor => ({
  id,
  name: id.toUpperCase(),
  logo: `data:image/png;base64,${id}`,
  tier,
  order,
  hidden: false,
});

const frameMs = 1000 / FPS;

describe("sponsorsByTier", () => {
  it("leaves out hidden sponsors", () => {
    const { main, partners } = sponsorsByTier([sponsor("a", 0, "main"), { ...sponsor("b", 1, "main"), hidden: true }, { ...sponsor("c", 2), hidden: true }, sponsor("d", 3)]);
    expect(main.map((s) => s.id)).toEqual(["a"]);
    expect(partners.map((s) => s.id)).toEqual(["d"]);
  });

  it("puts main sponsors first and keeps list order within each tier", () => {
    const { main, partners } = sponsorsByTier([sponsor("c", 2), sponsor("a", 0, "main"), sponsor("b", 1), sponsor("d", 3, "main")]);
    expect(main.map((s) => s.id)).toEqual(["a", "d"]);
    expect(partners.map((s) => s.id)).toEqual(["b", "c"]);
  });

  it("leaves out sponsors without a logo: the scene shows images only", () => {
    const { main, partners } = sponsorsByTier([{ ...sponsor("a", 0, "main"), logo: null }, sponsor("b", 1)]);
    expect(main).toEqual([]);
    expect(partners.map((s) => s.id)).toEqual(["b"]);
  });

  it("breaks order ties by name", () => {
    expect(sponsorsByTier([sponsor("b", 1), sponsor("a", 1)]).partners.map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("nextSponsorOrder", () => {
  it("is 0 for an empty list and one past the highest order otherwise", () => {
    expect(nextSponsorOrder([])).toBe(0);
    expect(nextSponsorOrder([sponsor("a", 4), sponsor("b", 1)])).toBe(5);
  });
});

describe("secondsPerSponsor", () => {
  it("rounds and clamps, and falls back to the default for junk", () => {
    expect(secondsPerSponsor(6.4)).toBe(6);
    expect(secondsPerSponsor(0)).toBe(2);
    expect(secondsPerSponsor(999)).toBe(60);
    expect(secondsPerSponsor("6")).toBe(DEFAULT_SECONDS_PER_SPONSOR);
    expect(secondsPerSponsor(NaN)).toBe(DEFAULT_SECONDS_PER_SPONSOR);
  });
});

describe("sponsorSlide", () => {
  const start = 1_000_000;
  const slotMs = 6_000;

  it("shows the only sponsor steadily", () => {
    expect(sponsorSlide(1, start, start + 50_000, 6)).toEqual({ index: 0, opacity: 1, nextChangeMs: Infinity });
    expect(sponsorSlide(0, start, start, 6).index).toBe(0);
  });

  it("steps through the sponsors from the take and wraps around", () => {
    expect(sponsorSlide(3, start, start + slotMs / 2, 6).index).toBe(0);
    expect(sponsorSlide(3, start, start + slotMs + 1, 6).index).toBe(1);
    expect(sponsorSlide(3, start, start + 3 * slotMs + 1, 6).index).toBe(0);
  });

  it("is the same in every window: it depends only on the take time and now", () => {
    const now = start + 17_345;
    expect(sponsorSlide(4, start, now, 6)).toEqual(sponsorSlide(4, start, now, 6));
  });

  it("fades in at the start of a turn and out at the end, in whole frames", () => {
    expect(sponsorSlide(2, start, start + slotMs, 6).opacity).toBe(0);
    expect(sponsorSlide(2, start, start + slotMs + 6 * frameMs + 1, 6).opacity).toBe(6 / SPONSOR_FADE_FRAMES);
    expect(sponsorSlide(2, start, start + slotMs / 2, 6).opacity).toBe(1);
    expect(sponsorSlide(2, start, start + slotMs - 1, 6).opacity).toBe(0);
  });

  it("shows the first sponsor at once after the take (the scene transition brings it in)", () => {
    expect(sponsorSlide(2, start, start, 6)).toMatchObject({ index: 0, opacity: 1 });
  });

  it("says when the opacity next changes", () => {
    // Solid in the middle of the turn: next change is where the fade-out starts.
    const mid = sponsorSlide(2, start, start + 3_000, 6);
    const fadeOutAt = slotMs - SPONSOR_FADE_FRAMES * frameMs;
    expect(mid.nextChangeMs).toBeCloseTo(fadeOutAt - 3_000);
    expect(sponsorSlide(2, start, start + fadeOutAt + 1, 6).opacity).toBeLessThan(1);
    expect(sponsorSlide(2, start, start + fadeOutAt - 1, 6).opacity).toBe(1);
    // While fading: the next frame.
    expect(sponsorSlide(2, start, start + slotMs + 1, 6).nextChangeMs).toBeCloseTo(frameMs - 1);
  });

  it("shows the first sponsor when the output's clock is behind the take time", () => {
    expect(sponsorSlide(3, start, start - 5_000, 6)).toMatchObject({ index: 0, opacity: 1 });
  });
});

describe("gridColumns", () => {
  it("puts a few logos in one row in a wide area", () => {
    expect(gridColumns(1, 3.3)).toBe(1);
    expect(gridColumns(3, 3.3)).toBe(3);
  });

  it("wraps many logos into rows", () => {
    const cols = gridColumns(20, 3.3);
    expect(cols).toBeGreaterThan(4);
    expect(cols).toBeLessThan(20);
  });

  it("never has more columns than logos", () => {
    for (let n = 1; n <= 20; n++) expect(gridColumns(n, 3.3)).toBeLessThanOrEqual(n);
  });
});

describe("sponsorsByTier hidden and edge cases", () => {
  it("leaves out hidden sponsors of both tiers, even with a logo", () => {
    const list = [
      { ...sponsor("a", 0, "main"), hidden: true },
      sponsor("b", 1, "main"),
      { ...sponsor("c", 2), hidden: true },
      sponsor("d", 3),
    ];
    const { main, partners } = sponsorsByTier(list);
    expect(main.map((s) => s.id)).toEqual(["b"]);
    expect(partners.map((s) => s.id)).toEqual(["d"]);
  });
  it("is empty when every sponsor is hidden or has no logo", () => {
    expect(sponsorsByTier([{ ...sponsor("a", 0, "main"), hidden: true }, { ...sponsor("b", 1), logo: null }])).toEqual({
      main: [],
      partners: [],
    });
    expect(sponsorsByTier([])).toEqual({ main: [], partners: [] });
  });
  it("treats an empty logo string as no logo", () => {
    expect(sponsorsByTier([{ ...sponsor("a", 0), logo: "" }]).partners).toEqual([]);
  });
  it("doesn't reorder the caller's list", () => {
    const list = [sponsor("b", 1), sponsor("a", 0)];
    sponsorsByTier(list);
    expect(list.map((s) => s.id)).toEqual(["b", "a"]);
  });
});

describe("nextSponsorOrder with hidden sponsors", () => {
  it("counts hidden sponsors so a new one never shares their order", () => {
    expect(nextSponsorOrder([sponsor("a", 0), { ...sponsor("b", 7), hidden: true }])).toBe(8);
  });
});

describe("sponsorOrderWrites", () => {
  const current = [sponsor("a", 0, "main"), sponsor("b", 1), sponsor("c", 2), sponsor("d", 3)];

  it("writes every order without the current list", () => {
    expect(sponsorOrderWrites(["b", "a"])).toEqual([
      { id: "b", fields: { order: 0 } },
      { id: "a", fields: { order: 1 } },
    ]);
  });

  it("writes only the orders that change", () => {
    expect(sponsorOrderWrites(["a", "c", "b", "d"], current)).toEqual([
      { id: "c", fields: { order: 1 } },
      { id: "b", fields: { order: 2 } },
    ]);
    expect(sponsorOrderWrites(["a", "b", "c", "d"], current)).toEqual([]);
  });

  it("writes unknown ids", () => {
    expect(sponsorOrderWrites(["a", "x"], [sponsor("a", 0)])).toEqual([{ id: "x", fields: { order: 1 } }]);
  });

  it("moves a sponsor into another tier with its order in the same write", () => {
    // c dragged to the end of the main tier
    expect(sponsorOrderWrites(["a", "c", "b", "d"], current, { id: "c", tier: "main" })).toEqual([
      { id: "c", fields: { order: 1, tier: "main" } },
      { id: "b", fields: { order: 2 } },
    ]);
  });

  it("sets the tier even when the order stays", () => {
    // b dragged to the end of main: same position in the full list
    expect(sponsorOrderWrites(["a", "b", "c", "d"], current, { id: "b", tier: "main" })).toEqual([
      { id: "b", fields: { tier: "main" } },
    ]);
  });

  it("skips the tier when it doesn't change", () => {
    expect(sponsorOrderWrites(["a", "b", "c", "d"], current, { id: "a", tier: "main" })).toEqual([]);
  });
});
