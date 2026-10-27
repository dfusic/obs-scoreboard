import { describe, expect, it } from "vitest";
import {
  DEFAULT_SECONDS_PER_SPONSOR,
  gridColumns,
  nextSponsorOrder,
  secondsPerSponsor,
  SPONSOR_FADE_FRAMES,
  sponsorSlide,
  sponsorsByTier,
} from "./sponsors";
import { FPS } from "./transitions";
import type { Sponsor } from "./types";

const sponsor = (id: string, order: number, tier: Sponsor["tier"] = "partner"): Sponsor => ({
  id,
  name: id.toUpperCase(),
  logo: `data:image/png;base64,${id}`,
  tier,
  order,
});

const frameMs = 1000 / FPS;

describe("sponsorsByTier", () => {
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
