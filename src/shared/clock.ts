import type { ClockState, ClockStop, Half } from "./types";

/**
 * Elapsed ms, computed locally from stored state. `stopAtMs` (see clockStopMs) holds the
 * result at that time; null = no limit. The stored clock itself is never clamped.
 */
export function computeElapsedMs(clock: ClockState, nowMs: number, stopAtMs: number | null = null): number {
  const elapsed =
    !clock.running || clock.startEpochMs === null ? clock.accumulatedMs : clock.accumulatedMs + (nowMs - clock.startEpochMs);
  return stopAtMs === null ? elapsed : Math.min(elapsed, stopAtMs);
}

/**
 * The clock stop in force for the half (ms), or null when the stop is off. A stop at or
 * below the half's start (e.g. 30:00 in the 2nd half) is ignored: it would freeze the half.
 */
export function clockStopMs(clockStop: ClockStop, half: Half): number | null {
  if (!clockStop.enabled) return null;
  const stopMs = half === 1 ? clockStop.half1Ms : clockStop.half2Ms;
  return isValidClockStop(stopMs, half) ? stopMs : null;
}

/** Whether a stop time can be used in the half: it must be after the half's start. */
export function isValidClockStop(stopMs: number, half: Half): boolean {
  return stopMs > HALF_START_MS[half];
}

/** Whether the shown clock is being held at the stop (the real time has reached it). */
export function isClockHeld(clock: ClockState, nowMs: number, stopAtMs: number | null): boolean {
  return stopAtMs !== null && computeElapsedMs(clock, nowMs) >= stopAtMs;
}

/**
 * Match time to record for a goal. While held at a stop it is kept just under the stop,
 * so goalMinute() labels a stoppage-time goal 45' (not 46', the 2nd half's first minute).
 */
export function goalElapsedMs(clock: ClockState, nowMs: number, stopAtMs: number | null = null): number {
  return computeElapsedMs(clock, nowMs, stopAtMs === null ? null : Math.max(0, stopAtMs - 1));
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** mm:ss of a duration in ms — minutes keep counting past 59 (e.g. 74:52, 105:00). */
export function formatMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return `${pad2(Math.floor(totalSeconds / 60))}:${pad2(totalSeconds % 60)}`;
}

/** mm:ss of the clock, held at `stopAtMs` when given (see computeElapsedMs). */
export function formatClock(clock: ClockState, nowMs: number, stopAtMs: number | null = null): string {
  return formatMs(computeElapsedMs(clock, nowMs, stopAtMs));
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

/**
 * Nudges the clock by `deltaMs` from the time shown: while held at a stop (`stopAtMs`),
 * from the stop, not the real time past it (held at 45:00 with real 47:10, −1m gives 44:00).
 */
export function adjustClockMs(clock: ClockState, deltaMs: number, nowMs: number, stopAtMs: number | null = null): ClockState {
  return setClockElapsedMs(clock, computeElapsedMs(clock, nowMs, stopAtMs) + deltaMs, nowMs);
}

/** Where the clock starts each half: the 2nd half counts on from 45:00. */
export const HALF_START_MS: Record<Half, number> = { 1: 0, 2: 45 * 60_000 };

/** The clock, stopped at the start of the given half. */
export function halfStartClock(half: Half): ClockState {
  return { running: false, startEpochMs: null, accumulatedMs: HALF_START_MS[half] };
}
