export type Team = "home" | "away";

export interface ClockState {
  running: boolean;
  /** Date.now() when the current running segment began; null while paused. */
  startEpochMs: number | null;
  /** ms banked before the current running segment. */
  accumulatedMs: number;
}

export interface MatchState {
  score: { home: number; away: number };
  clock: ClockState;
  /** Logos are stored inline as resized PNG data URLs (see image.ts). */
  logos: { home: string | null; away: string | null };
}

export function createInitialMatchState(): MatchState {
  return {
    score: { home: 0, away: 0 },
    clock: { running: false, startEpochMs: null, accumulatedMs: 0 },
    logos: { home: null, away: null },
  };
}
