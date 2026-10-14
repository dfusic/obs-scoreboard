export type Side = "home" | "away";
export const SIDES: readonly Side[] = ["home", "away"];

export interface ClockState {
  running: boolean;
  /** Date.now() when the current running segment began; null while paused. */
  startEpochMs: number | null;
  /** ms banked before the current running segment. */
  accumulatedMs: number;
}

/** A club, stored in workspaces/{ws}/teams/{id}. Logo is an inline PNG data URL (see image.ts). */
export interface TeamProfile {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string | null;
}

export type TeamFields = Omit<TeamProfile, "id">;

export const NEW_TEAM: TeamFields = {
  name: "New team",
  shortName: "",
  primaryColor: "#1e3a8a",
  secondaryColor: "#ffffff",
  logo: null,
};

/** A squad member, stored in workspaces/{ws}/players/{id}. Photo is an inline PNG data URL (transparent cut-outs). */
export interface Player {
  id: string;
  teamId: string;
  /** Full name, as shown on air. */
  name: string;
  photo: string | null;
}

export type PlayerFields = Omit<Player, "id">;

export const SCENE_TYPES = [
  "scoreboard",
  "welcome",
  "presentation",
  "goal",
  "playerCard",
  "lineup",
  "halftime",
  "fulltime",
] as const;
export type SceneType = (typeof SCENE_TYPES)[number];

export const SCENE_LABELS: Record<SceneType, string> = {
  scoreboard: "Scoreboard",
  welcome: "Welcome",
  presentation: "Player intro",
  goal: "Goal scorer",
  playerCard: "Player card",
  lineup: "Lineup",
  halftime: "Half time",
  fulltime: "Full time",
};

/** Per-template options, stored in workspaces/{ws}/scenes/{sceneType}. */
export interface SceneConfig {
  title: string;
  subtitle: string;
  accentColor: string;
  /** Inline JPEG data URL; null shows the default background video. */
  background: string | null;
  /** Auto-return to the scoreboard after this long; null stays on air until the next Take. */
  durationMs: number | null;
}

/** What the output page shows. Derived locally like the clock: see program.ts. */
export interface ProgramState {
  scene: SceneType;
  /** Team the scene is about (goal, playerCard, lineup). */
  side: Side | null;
  playerId: string | null;
  startedAtMs: number;
  autoReturnMs: number | null;
}

export interface GoalEvent {
  side: Side;
  playerId: string | null;
  /** Match clock when the goal was recorded. */
  elapsedMs: number;
}

/** The live match, stored in workspaces/{ws}/live/match. */
export interface MatchState {
  score: Record<Side, number>;
  clock: ClockState;
  /** Team ids of the two sides; null until picked on the Live page. */
  teams: Record<Side, string | null>;
  /** Players ticked as playing this match, in presentation order (player ids). */
  lineup: Record<Side, string[]>;
  /** Whether the away team's players and photos are available; off = home-only features. */
  awayPlayers: boolean;
  goals: GoalEvent[];
  program: ProgramState;
}

export function createInitialProgram(): ProgramState {
  return { scene: "scoreboard", side: null, playerId: null, startedAtMs: 0, autoReturnMs: null };
}

export function createInitialMatchState(): MatchState {
  return {
    score: { home: 0, away: 0 },
    clock: { running: false, startEpochMs: null, accumulatedMs: 0 },
    teams: { home: null, away: null },
    lineup: { home: [], away: [] },
    awayPlayers: false,
    goals: [],
    program: createInitialProgram(),
  };
}

export type SceneConfigs = Record<SceneType, SceneConfig>;

export function defaultSceneConfigs(): SceneConfigs {
  return structuredClone(DEFAULT_SCENE_CONFIGS);
}

export const DEFAULT_SCENE_CONFIGS: SceneConfigs = {
  scoreboard: { title: "", subtitle: "", accentColor: "#ffffff", background: null, durationMs: null },
  welcome: { title: "Welcome", subtitle: "", accentColor: "#e8c547", background: null, durationMs: null },
  presentation: { title: "", subtitle: "", accentColor: "#ffffff", background: null, durationMs: null },
  goal: { title: "Goal!", subtitle: "", accentColor: "#e83a3a", background: null, durationMs: 15_000 },
  playerCard: { title: "", subtitle: "", accentColor: "#3d8bff", background: null, durationMs: 10_000 },
  lineup: { title: "Starting lineup", subtitle: "", accentColor: "#3d8bff", background: null, durationMs: null },
  halftime: { title: "Half time", subtitle: "", accentColor: "#e8c547", background: null, durationMs: null },
  fulltime: { title: "Full time", subtitle: "", accentColor: "#e8c547", background: null, durationMs: null },
};
