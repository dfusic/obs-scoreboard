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
  /** Town or city, shown under the name on the Semafor scoreboard. */
  city: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string | null;
}

export type TeamFields = Omit<TeamProfile, "id">;

export const NEW_TEAM: TeamFields = {
  name: "New team",
  shortName: "",
  city: "",
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

/** Main sponsors are shown larger, above the partners. */
export type SponsorTier = "main" | "partner";

/**
 * One of the account's own sponsors (never a team's), stored in workspaces/{ws}/sponsors/{id}.
 * Logo is an inline PNG data URL (see image.ts).
 */
export interface Sponsor {
  id: string;
  name: string;
  logo: string | null;
  tier: SponsorTier;
  /** Position in the sponsor list (ascending); the Sponsors scene keeps it within each tier. */
  order: number;
}

export type SponsorFields = Omit<Sponsor, "id">;

export const NEW_SPONSOR: SponsorFields = { name: "New sponsor", logo: null, tier: "partner", order: 0 };

export const SCENE_TYPES = [
  "scoreboard",
  "welcome",
  "presentation",
  "goal",
  "playerCard",
  "lineup",
  "halftime",
  "fulltime",
  "sponsors",
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
  sponsors: "Sponsors",
};

/** Per-scene options, stored in workspaces/{ws}/scenes/{sceneType}. */
export interface SceneConfig {
  title: string;
  subtitle: string;
  /**
   * Unused for now: scene colours come from the global colour scheme (the scheme's
   * `highlight`). Kept for per-scene colour overrides later.
   */
  accentColor: string;
  /** Inline JPEG data URL; null shows the default background video. */
  background: string | null;
  /** Inline PNG data URL. Scoreboard only: the competition logo on the Semafor theme. */
  logo: string | null;
  /**
   * The scene's own layout within the theme, from SCENE_LAYOUTS (themes.ts); "standard"
   * where a scene has one. Stored as `template` before themes were introduced.
   */
  layout: string;
  /** Sponsors only: how long each sponsor stays up in the "One at a time" layout. */
  secondsPerSponsor: number;
}

/** What the output page shows; only a take changes it (see program.ts). */
export interface ProgramState {
  scene: SceneType;
  /** Team the scene is about (goal, playerCard, lineup). */
  side: Side | null;
  playerId: string | null;
  /** When it was taken. Nothing returns on its own: a scene stays on air until the next take. */
  startedAtMs: number;
}

export type Half = 1 | 2;

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
  /** Half being played: labels the scoreboard. */
  half: Half;
}

export function createInitialProgram(): ProgramState {
  return { scene: "scoreboard", side: null, playerId: null, startedAtMs: 0 };
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
    half: 1,
  };
}

export type SceneConfigs = Record<SceneType, SceneConfig>;

export function defaultSceneConfigs(): SceneConfigs {
  return structuredClone(DEFAULT_SCENE_CONFIGS);
}

export const DEFAULT_SCENE_CONFIGS: SceneConfigs = {
  scoreboard: { title: "", subtitle: "", accentColor: "#ffffff", background: null, logo: null, layout: "standard", secondsPerSponsor: 6 },
  welcome: { title: "Welcome", subtitle: "", accentColor: "#e8c547", background: null, logo: null, layout: "standard", secondsPerSponsor: 6 },
  presentation: { title: "", subtitle: "", accentColor: "#ffffff", background: null, logo: null, layout: "standard", secondsPerSponsor: 6 },
  goal: { title: "Goal!", subtitle: "", accentColor: "#e83a3a", background: null, logo: null, layout: "standard", secondsPerSponsor: 6 },
  playerCard: { title: "", subtitle: "", accentColor: "#3d8bff", background: null, logo: null, layout: "standard", secondsPerSponsor: 6 },
  lineup: { title: "Starting lineup", subtitle: "", accentColor: "#3d8bff", background: null, logo: null, layout: "standard", secondsPerSponsor: 6 },
  halftime: { title: "Half time", subtitle: "", accentColor: "#e8c547", background: null, logo: null, layout: "standard", secondsPerSponsor: 6 },
  fulltime: { title: "Full time", subtitle: "", accentColor: "#e8c547", background: null, logo: null, layout: "standard", secondsPerSponsor: 6 },
  sponsors: { title: "Sponsors", subtitle: "", accentColor: "#e8c547", background: null, logo: null, layout: "grid", secondsPerSponsor: 6 },
};

/**
 * A colour scheme's colours, used by every scene. Which ones a theme's scoreboard uses,
 * and their labels, are in themes.ts (THEME_COLORS).
 */
export interface SchemeColors {
  /** Solid background behind every scene; null plays the default background video. */
  background: string | null;
  score: string;
  names: string;
  timer: string;
  accent: string;
  /** Titles, borders and accents on the scenes other than the scoreboard. */
  highlight: string;
}

/** The look of every scene, stored in workspaces/{ws}/settings/graphics. */
export interface GraphicsSettings {
  /** A THEMES id (themes.ts). Stored as `template` before themes were introduced. */
  theme: string;
  colors: SchemeColors;
  /** A TRANSITIONS id (transitions.ts): the effect between scenes. */
  transition: string;
}
