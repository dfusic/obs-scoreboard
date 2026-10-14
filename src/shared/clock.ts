import type { ClockState, Half } from "./types";

/** Elapsed ms, computed locally from stored state. */
export function computeElapsedMs(clock: ClockState, nowMs: number): number {
  if (!clock.running || clock.startEpochMs === null) {
    return clock.accumulatedMs;
  }
  return clock.accumulatedMs + (nowMs - clock.startEpochMs);
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** mm:ss — minutes keep counting past 59 (e.g. 74:52, 105:00). */
export function formatClock(clock: ClockState, nowMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(computeElapsedMs(clock, nowMs) / 1000));
  return `${pad2(Math.floor(totalSeconds / 60))}:${pad2(totalSeconds % 60)}`;
}

/** Parses "mm:ss" (or bare minutes) to ms; null if invalid. */
export function parseClockInput(text: string): number | null {
  const match = /^\s*(\d{1,3})(?::([0-5]?\d))?\s*$/.exec(text);
  if (!match) return null;
  return (Number(match[1]) * 60 + Number(match[2] ?? 0)) * 1000;
}

export function startOrResumeClock(clock: ClockState, nowMs: number): ClockState {
  if (clock.running) return clock;
  return { ...clock, running: true, startEpochMs: nowMs };
}

export function pauseClock(clock: ClockState, nowMs: number): ClockState {
  if (!clock.running || clock.startEpochMs === null) return clock;
  return {
    running: false,
    startEpochMs: null,
    accumulatedMs: clock.accumulatedMs + (nowMs - clock.startEpochMs),
  };
}

/** Jumps the clock to an exact elapsed time, keeping it running if it was. */
export function setClockElapsedMs(clock: ClockState, elapsedMs: number, nowMs: number): ClockState {
  return {
    running: clock.running,
    startEpochMs: clock.running ? nowMs : null,
    accumulatedMs: Math.max(0, elapsedMs),
  };
}

export function adjustClockMs(clock: ClockState, deltaMs: number, nowMs: number): ClockState {
  return setClockElapsedMs(clock, computeElapsedMs(clock, nowMs) + deltaMs, nowMs);
}

/** Where the clock starts each half: the 2nd half counts on from 45:00. */
export const HALF_START_MS: Record<Half, number> = { 1: 0, 2: 45 * 60_000 };

/** The clock, stopped at the start of the given half. */
export function halfStartClock(half: Half): ClockState {
  return { running: false, startEpochMs: null, accumulatedMs: HALF_START_MS[half] };
}
