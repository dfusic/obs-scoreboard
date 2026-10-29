import { describe, expect, it } from "vitest";
import {
  adjustClockMs,
  clockStopMs,
  computeElapsedMs,
  formatClock,
  formatMs,
  goalElapsedMs,
  halfStartClock,
  isClockHeld,
  isValidClockStop,
  parseClockInput,
  pauseClock,
  setClockElapsedMs,
  startOrResumeClock,
} from "./clock";
import { goalMinute } from "./program";
import type { ClockState, ClockStop } from "./types";

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

describe("clock stop", () => {
  const stop: ClockStop = { enabled: true, half1Ms: 45 * 60_000, half2Ms: 90 * 60_000 };
  const HALF1 = 45 * 60_000;

  it("picks the current half's limit, or null when off", () => {
    expect(clockStopMs(stop, 1)).toBe(45 * 60_000);
    expect(clockStopMs(stop, 2)).toBe(90 * 60_000);
    expect(clockStopMs({ ...stop, enabled: false }, 1)).toBeNull();
  });

  it("holds a running clock at the limit", () => {
    const clock = baseClock({ running: true, startEpochMs: 0, accumulatedMs: 44 * 60_000 });
    expect(formatClock(clock, 30_000, HALF1)).toBe("44:30");
    expect(formatClock(clock, 5 * 60_000, HALF1)).toBe("45:00");
    expect(computeElapsedMs(clock, 5 * 60_000, HALF1)).toBe(HALF1);
    expect(isClockHeld(clock, 30_000, HALF1)).toBe(false);
    expect(isClockHeld(clock, 5 * 60_000, HALF1)).toBe(true);
  });

  it("clamps a paused clock above the limit, not one below it", () => {
    expect(formatClock(baseClock({ accumulatedMs: 40 * 60_000 }), 0, HALF1)).toBe("40:00");
    expect(formatClock(baseClock({ accumulatedMs: 47 * 60_000 }), 0, HALF1)).toBe("45:00");
  });

  it("null means no limit, and the stored clock keeps the real time", () => {
    const clock = baseClock({ running: true, startEpochMs: 0, accumulatedMs: 44 * 60_000 });
    expect(formatClock(clock, 3 * 60_000, null)).toBe("47:00");
    expect(isClockHeld(clock, 3 * 60_000, null)).toBe(false);
    // Pausing while held banks the real time: turning the stop off continues from 47:00.
    expect(pauseClock(clock, 3 * 60_000).accumulatedMs).toBe(47 * 60_000);
  });

  it("records a held goal in the half's last minute", () => {
    const clock = baseClock({ running: true, startEpochMs: 0, accumulatedMs: 44 * 60_000 });
    expect(goalMinute(goalElapsedMs(clock, 3 * 60_000, HALF1))).toBe(45);
    expect(goalMinute(goalElapsedMs(clock, 30_000, HALF1))).toBe(45);
    expect(goalElapsedMs(clock, 3 * 60_000, null)).toBe(47 * 60_000);
  });

  it("holds from exactly the stop, not a millisecond before", () => {
    const clock = baseClock({ running: true, startEpochMs: 0, accumulatedMs: 44 * 60_000 });
    expect(isClockHeld(clock, 60_000 - 1, HALF1)).toBe(false);
    expect(formatClock(clock, 60_000 - 1, HALF1)).toBe("44:59");
    expect(isClockHeld(clock, 60_000, HALF1)).toBe(true);
    expect(formatClock(clock, 60_000, HALF1)).toBe("45:00");
  });

  it("counts a paused clock past the stop as held", () => {
    expect(isClockHeld(baseClock({ accumulatedMs: 47 * 60_000 }), 0, HALF1)).toBe(true);
    expect(isClockHeld(baseClock({ accumulatedMs: 40 * 60_000 }), 0, HALF1)).toBe(false);
  });

  it("records a goal before the stop at its real time", () => {
    const clock = baseClock({ running: true, startEpochMs: 0, accumulatedMs: 30 * 60_000 });
    expect(goalElapsedMs(clock, 15_000, HALF1)).toBe(30 * 60_000 + 15_000);
  });

  it("records a held 2nd-half goal as 90'", () => {
    const clock = baseClock({ running: true, startEpochMs: 0, accumulatedMs: 89 * 60_000 });
    const half2 = clockStopMs(stop, 2);
    expect(formatClock(clock, 4 * 60_000, half2)).toBe("90:00");
    expect(goalMinute(goalElapsedMs(clock, 4 * 60_000, half2))).toBe(90);
  });

  it("nudges from the shown time while held", () => {
    // Held at 45:00 with the real time at 47:10.
    const clock = baseClock({ running: true, startEpochMs: 0, accumulatedMs: 44 * 60_000 });
    const now = 3 * 60_000 + 10_000;
    const back = adjustClockMs(clock, -60_000, now, HALF1);
    expect(formatClock(back, now, HALF1)).toBe("44:00");
    expect(isClockHeld(back, now, HALF1)).toBe(false);
    expect(computeElapsedMs(adjustClockMs(clock, 1_000, now, HALF1), now)).toBe(HALF1 + 1_000);
    // Without a stop, or before it, the real time is nudged.
    expect(computeElapsedMs(adjustClockMs(clock, -60_000, now), now)).toBe(46 * 60_000 + 10_000);
    expect(computeElapsedMs(adjustClockMs(clock, -1_000, 30_000, HALF1), 30_000)).toBe(44 * 60_000 + 29_000);
  });

  it("ignores a stop at or below the half's start", () => {
    expect(clockStopMs({ ...stop, half2Ms: 30 * 60_000 }, 2)).toBeNull();
    expect(clockStopMs({ ...stop, half2Ms: 45 * 60_000 }, 2)).toBeNull();
    expect(clockStopMs({ ...stop, half2Ms: 45 * 60_000 + 1_000 }, 2)).toBe(45 * 60_000 + 1_000);
    expect(clockStopMs({ ...stop, half1Ms: 0 }, 1)).toBeNull();
    expect(isValidClockStop(30 * 60_000, 2)).toBe(false);
    expect(isValidClockStop(30 * 60_000, 1)).toBe(true);
    expect(isValidClockStop(0, 1)).toBe(false);
  });

  it("never records a negative time with a stop at 00:00", () => {
    const clock = baseClock({ running: true, startEpochMs: 0, accumulatedMs: 0 });
    expect(goalElapsedMs(clock, 5_000, 0)).toBe(0);
    expect(formatClock(clock, 5_000, 0)).toBe("00:00");
  });
});

describe("formatMs", () => {
  it("formats a duration as mm:ss, rounding down to the second", () => {
    expect(formatMs(45 * 60_000)).toBe("45:00");
    expect(formatMs(90 * 60_000)).toBe("90:00");
    expect(formatMs(59_999)).toBe("00:59");
  });

  it("keeps counting minutes past 99 and never goes negative", () => {
    expect(formatMs(105 * 60_000 + 7_000)).toBe("105:07");
    expect(formatMs(-5_000)).toBe("00:00");
  });
});

describe("halfStartClock", () => {
  it("stops the clock at 00:00 for the 1st half and 45:00 for the 2nd", () => {
    expect(formatClock(halfStartClock(1), 0)).toBe("00:00");
    expect(formatClock(halfStartClock(2), 0)).toBe("45:00");
    expect(halfStartClock(2).running).toBe(false);
  });
});
