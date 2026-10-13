import type { ProgramState, SceneType, Side } from "./types";

/**
 * Like the clock, the on-air scene is stored as state and derived locally:
 * a timed scene (e.g. goal) falls back to the scoreboard once its duration has
 * passed, with no extra Firestore write. Keep these pure; pass Date.now().
 */
export function activeScene(program: ProgramState, nowMs: number): SceneType {
  return remainingMs(program, nowMs) === 0 ? "scoreboard" : program.scene;
}

/** ms until auto-return, 0 once it has returned, null if the scene stays on air. */
export function remainingMs(program: ProgramState, nowMs: number): number | null {
  if (program.autoReturnMs === null) return null;
  return Math.max(0, program.startedAtMs + program.autoReturnMs - nowMs);
}

export function takeScene(
  scene: SceneType,
  durationMs: number | null,
  nowMs: number,
  target: { side?: Side | null; playerId?: string | null } = {},
): ProgramState {
  return {
    scene,
    side: target.side ?? null,
    playerId: target.playerId ?? null,
    startedAtMs: nowMs,
    autoReturnMs: scene === "scoreboard" ? null : durationMs,
  };
}

/** Football minute for a goal: 0:00-0:59 is the 1st minute. */
export function goalMinute(elapsedMs: number): number {
  return Math.floor(Math.max(0, elapsedMs) / 60_000) + 1;
}
