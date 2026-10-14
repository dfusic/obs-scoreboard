import type {
  ClockState,
  GoalEvent,
  GraphicsSettings,
  Half,
  MatchState,
  Player,
  PlayerFields,
  ProgramState,
  SceneConfig,
  SceneConfigs,
  SceneType,
  Side,
  TeamFields,
  TeamProfile,
} from "../types";

/**
 * The app's only way to read and write data. The UI never imports a backend directly,
 * so the sync transport can be swapped:
 *
 * - `firestore` (today): Firebase Auth + Firestore with a persistent local cache, so pages
 *   keep working through network drops and queued writes sync on reconnect.
 * - `local` (planned): fully offline at the venue. Control and the OBS overlay run on one
 *   machine and sync through a local hub instead of the cloud.
 *
 * Keep operations domain-level ("record a goal"), not storage-level ("update this path"),
 * and avoid anything that needs a server round-trip (e.g. Firestore transactions): those
 * fail offline. A write is applied locally (and seen by subscribers) at once, but its
 * promise may stay pending until it reaches the shared state, so the UI must never wait
 * on one to stay usable: fire it with `void` and let a rejection surface as a warning.
 */
export interface DataStore {
  readonly kind: "firestore" | "local";
  readonly auth: AuthApi;
  readonly match: MatchApi;
  readonly teams: TeamsApi;
  readonly players: PlayersApi;
  readonly scenes: ScenesApi;
  readonly graphics: GraphicsApi;
  readonly sync: SyncApi;
}

export type Unsubscribe = () => void;
/** Called when a subscription fails. A failed subscription stays stopped. */
export type OnError = (err: Error) => void;

export interface AppUser {
  id: string;
  /** What to show for the signed-in operator. */
  label: string;
}

export interface AuthApi {
  /** Fires with the current user (null when signed out) and on every change. */
  subscribe(onChange: (user: AppUser | null) => void): Unsubscribe;
  signIn(username: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Operator-facing message for a failed sign-in. */
  describeError(err: unknown): string;
}

export interface MatchApi {
  subscribe(onChange: (match: MatchState) => void): Unsubscribe;
  /** Creates the match with initial state if there is none yet. Called once by the control page. */
  ensureInitialized(): Promise<void>;
  /** Starts over, keeping the pre-match setup (teams, lineups, away players). */
  reset(current: MatchState): Promise<void>;
  updateClock(clock: ClockState): Promise<void>;
  /** Picks a side's team; its lineup is cleared since it belonged to another squad. */
  setTeam(side: Side, teamId: string | null): Promise<void>;
  setLineup(side: Side, playerIds: string[]): Promise<void>;
  setAwayPlayers(enabled: boolean): Promise<void>;
  setProgram(program: ProgramState): Promise<void>;
  /** Switches to the given half with the clock set for it (see halfStartClock), in one write. */
  startHalf(half: Half, clock: ClockState): Promise<void>;
  /** Stops the clock and, if given, puts `program` on air (half time / full time), in one write. */
  endHalf(clock: ClockState, program: ProgramState | null): Promise<void>;
  /** Zeroes both scores and clears the goal list. */
  resetScores(): Promise<void>;
  /** Bumps the score, logs the goal and, if given, puts `program` on air, in one write. */
  recordGoal(goal: GoalEvent, program: ProgramState | null): Promise<void>;
  /** Lowers the side's score and drops its latest goal, based on the caller's `current` state. */
  removeLastGoal(current: MatchState, side: Side): Promise<void>;
}

export interface TeamsApi {
  /** All teams, sorted by name. */
  subscribeAll(onChange: (teams: TeamProfile[]) => void): Unsubscribe;
  /** One team; null if it doesn't exist (e.g. deleted while selected). */
  subscribe(id: string, onChange: (team: TeamProfile | null) => void): Unsubscribe;
  /** Returns the new id at once; the write itself may still be pending. */
  create(fields?: Partial<TeamFields>): string;
  update(id: string, fields: Partial<TeamFields>): Promise<void>;
  /** Deletes the team and its players. */
  remove(id: string): Promise<void>;
}

export interface PlayersApi {
  /** Players of the given teams, sorted by name. Calls back with [] for no teams. */
  subscribe(teamIds: string[], onChange: (players: Player[]) => void): Unsubscribe;
  /** Returns the new id at once; the write itself may still be pending. */
  create(fields: PlayerFields): string;
  update(id: string, fields: Partial<PlayerFields>): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface ScenesApi {
  /** All scene templates, with defaults for any not customised yet. */
  subscribe(onChange: (scenes: SceneConfigs) => void): Unsubscribe;
  update(type: SceneType, fields: Partial<SceneConfig>): Promise<void>;
}

export interface GraphicsApi {
  /** The scoreboard look, with defaults when it was never saved. */
  subscribe(onChange: (graphics: GraphicsSettings) => void): Unsubscribe;
  /** Replaces the scoreboard look; it shows on air at once. */
  save(graphics: GraphicsSettings): Promise<void>;
}

/**
 * Whether this page is in step with the shared state. `connected: false` means it is
 * working from local data; `pendingWrites` means local changes haven't reached the others yet.
 */
export interface SyncStatus {
  connected: boolean;
  pendingWrites: boolean;
}

export interface SyncApi {
  subscribe(onChange: (status: SyncStatus) => void): Unsubscribe;
}
