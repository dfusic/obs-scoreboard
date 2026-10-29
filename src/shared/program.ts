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

/**
 * What the output shows, as far as transitions go: the scene and its side. A take of
 * another scene, or of the same scene for the other side (Lineup home → Lineup away),
 * plays a transition; a new take of the same view doesn't (e.g. the player intro's
 * Prev/Next, which only changes the player). A string, so it compares by value.
 */
export function programView(program: Pick<ProgramState, "scene" | "side">): string {
  return `${program.scene}:${program.side ?? ""}`;
}

/** The scene of a programView() string. */
export function viewScene(view: string): SceneType {
  return view.slice(0, view.indexOf(":")) as SceneType;
}

/**
 * Identifies one take, so scene content that runs on its own (the marquee, the lineup
 * scroll) restarts from the start on every new take, even of the scene already on air.
 */
export function takeKey(program: Pick<ProgramState, "side" | "startedAtMs">): string {
  return `${program.side ?? ""}:${program.startedAtMs}`;
}

/** Football minute for a goal: 0:00-0:59 is the 1st minute. */
export function goalMinute(elapsedMs: number): number {
  return Math.floor(Math.max(0, elapsedMs) / 60_000) + 1;
}
