import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRANSITION,
  FRAMES,
  frameAt,
  totalFrames,
  transition,
  transitionFrame,
  TRANSITIONS,
} from "./transitions";

describe("TRANSITIONS", () => {
  it("has unique ids and defaults to Fade", () => {
    expect(new Set(TRANSITIONS.map((t) => t.id)).size).toBe(TRANSITIONS.length);
    expect(transition(DEFAULT_TRANSITION).id).toBe("fade");
    expect(transition("nope").id).toBe("fade");
    expect(transition(undefined).id).toBe("fade");
    expect(transition("iris").kind).toBe("cover");
  });
});

describe("totalFrames", () => {
  it("is when each kind is done", () => {
    for (const kind of ["cut", "fade", "popup", "cover"] as const) {
      const total = totalFrames(kind);
      expect(transitionFrame(kind, total).done).toBe(true);
      if (total > 0) expect(transitionFrame(kind, total - 1).done).toBe(false);
    }
  });
});

describe("frameAt", () => {
  it("counts whole 30 fps frames", () => {
    expect(frameAt(1_000, 1_000)).toBe(0);
    expect(frameAt(1_000, 1_033)).toBe(0);
    expect(frameAt(1_000, 1_034)).toBe(1);
    expect(frameAt(1_000, 2_000)).toBe(30);
    expect(frameAt(1_000, 900)).toBe(0);
  });
});

describe("transitionFrame", () => {
  it("cut is done at once", () => {
    expect(transitionFrame("cut", 0)).toMatchObject({ swapped: true, done: true });
  });

  it("fade crosses over in half a second", () => {
    expect(transitionFrame("fade", 0)).toMatchObject({ out: 0, in: 0, done: false });
    expect(transitionFrame("fade", 7).in).toBeGreaterThan(0.3);
    expect(transitionFrame("fade", FRAMES.fade)).toMatchObject({ out: 1, in: 1, done: true });
  });

  it("popup removes the old scene, then pops the new one in past full size", () => {
    expect(transitionFrame("popup", FRAMES.popupOut - 1)).toMatchObject({ swapped: false, in: 0 });
    expect(transitionFrame("popup", FRAMES.popupOut)).toMatchObject({ swapped: true, out: 1 });
    const peak = Math.max(...Array.from({ length: FRAMES.popupIn }, (_, i) => transitionFrame("popup", FRAMES.popupOut + i).in));
    expect(peak).toBeGreaterThan(1);
    expect(transitionFrame("popup", FRAMES.popupOut + FRAMES.popupIn)).toMatchObject({ in: 1, done: true });
  });

  it("cover closes, swaps the scene while covered with the logo shown, then opens", () => {
    expect(transitionFrame("cover", 0)).toMatchObject({ cover: 0, reveal: 0, logo: 0, swapped: false });
    expect(transitionFrame("cover", FRAMES.cover - 1).swapped).toBe(false);
    const hold = transitionFrame("cover", FRAMES.cover + 1);
    expect(hold).toMatchObject({ cover: 1, reveal: 0, logo: 1, swapped: true, done: false });
    const end = FRAMES.cover + FRAMES.hold + FRAMES.reveal;
    expect(transitionFrame("cover", end)).toMatchObject({ cover: 1, reveal: 1, logo: 0, done: true });
    expect(transitionFrame("cover", end - 1).done).toBe(false);
  });
});
