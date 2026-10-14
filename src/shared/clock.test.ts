import { describe, expect, it } from "vitest";
import {
  adjustClockMs,
  computeElapsedMs,
  formatClock,
  halfStartClock,
  parseClockInput,
  pauseClock,
  setClockElapsedMs,
  startOrResumeClock,
} from "./clock";
import type { ClockState } from "./types";

function baseClock(overrides: Partial<ClockState> = {}): ClockState {
  return { running: false, startEpochMs: null, accumulatedMs: 0, ...overrides };
}

describe("computeElapsedMs", () => {
  it("returns accumulatedMs when paused", () => {
    expect(computeElapsedMs(baseClock({ accumulatedMs: 60_000 }), 999_999)).toBe(60_000);
  });

  it("adds time since startEpochMs when running", () => {
    const clock = baseClock({ running: true, startEpochMs: 1_000, accumulatedMs: 5_000 });
    expect(computeElapsedMs(clock, 3_000)).toBe(7_000);
  });
});

describe("startOrResumeClock / pauseClock", () => {
  it("is a no-op to start an already-running clock", () => {
    const clock = baseClock({ running: true, startEpochMs: 1_000 });
    expect(startOrResumeClock(clock, 5_000)).toBe(clock);
  });

  it("banks elapsed time into accumulatedMs on pause", () => {
    const paused = pauseClock(startOrResumeClock(baseClock(), 1_000), 4_000);
    expect(paused).toEqual({ running: false, startEpochMs: null, accumulatedMs: 3_000 });
  });

  it("is a no-op to pause an already-paused clock", () => {
    const clock = baseClock({ accumulatedMs: 10_000 });
    expect(pauseClock(clock, 999_999)).toBe(clock);
  });
});

describe("setClockElapsedMs / adjustClockMs", () => {
  it("sets an exact time while paused", () => {
    const next = setClockElapsedMs(baseClock({ accumulatedMs: 5_000 }), 74 * 60_000, 0);
    expect(next.accumulatedMs).toBe(74 * 60_000);
    expect(next.running).toBe(false);
  });

  it("keeps running from the new time", () => {
    const next = setClockElapsedMs(baseClock({ running: true, startEpochMs: 0 }), 60_000, 10_000);
    expect(computeElapsedMs(next, 15_000)).toBe(65_000);
  });

  it("never goes below zero", () => {
    expect(adjustClockMs(baseClock({ accumulatedMs: 30_000 }), -60_000, 0).accumulatedMs).toBe(0);
  });
});

describe("formatClock", () => {
  it("shows mm:ss", () => {
    expect(formatClock(baseClock({ accumulatedMs: (10 * 60 + 5) * 1000 }), 0)).toBe("10:05");
  });

  it("keeps counting minutes past 59", () => {
    expect(formatClock(baseClock({ accumulatedMs: (74 * 60 + 52) * 1000 }), 0)).toBe("74:52");
  });
});

describe("parseClockInput", () => {
  it("parses mm:ss and bare minutes", () => {
    expect(parseClockInput("74:52")).toBe((74 * 60 + 52) * 1000);
    expect(parseClockInput("45")).toBe(45 * 60_000);
  });

  it("rejects garbage and seconds >= 60", () => {
    expect(parseClockInput("abc")).toBeNull();
    expect(parseClockInput("10:75")).toBeNull();
  });
});

describe("halfStartClock", () => {
  it("stops the clock at 00:00 for the 1st half and 45:00 for the 2nd", () => {
    expect(formatClock(halfStartClock(1), 0)).toBe("00:00");
    expect(formatClock(halfStartClock(2), 0)).toBe("45:00");
    expect(halfStartClock(2).running).toBe(false);
  });
});
