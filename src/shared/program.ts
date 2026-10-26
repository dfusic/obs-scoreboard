import type { ProgramState, SceneType, Side } from "./types";

/**
 * What's on air is stored as state, and only a take changes it: no scene ever
 * returns to the scoreboard on its own. Keep these pure; pass Date.now().
 */
export function takeScene(
  scene: SceneType,
  nowMs: number,
  target: { side?: Side | null; playerId?: string | null } = {},
): ProgramState {
  return { scene, side: target.side ?? null, playerId: target.playerId ?? null, startedAtMs: nowMs };
}

/** Football minute for a goal: 0:00-0:59 is the 1st minute. */
export function goalMinute(elapsedMs: number): number {
  return Math.floor(Math.max(0, elapsedMs) / 60_000) + 1;
}
