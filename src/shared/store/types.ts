import type {
  ClockState,
  GoalEvent,
  GraphicsDraft,
  GraphicsSettings,
  Half,
  MatchState,
  Player,
  PlayerFields,
  ProgramState,
  SceneConfigs,
  Side,
  Sponsor,
  SponsorFields,
  SponsorTier,
  TeamEditableFields,
  TeamProfile,
} from "../types";

/**
 * The app's only way to read and write data. The UI never imports a backend directly,
 * so the sync transport can be swapped:
 *
 * - `firestore` (today): Firebase Auth + Firestore with a persistent local cache, so pages
 *   keep working through network drops and queued writes sync on reconnect.
 * - `local` (planned): fully offline at the venue. Control and the output page run on one
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
  readonly sponsors: SponsorsApi;
  readonly scenes: ScenesApi;
  readonly graphics: GraphicsApi;
  readonly graphicsDraft: GraphicsDraftApi;
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
  /** Stops the clock at the end of a half. What's on air doesn't change. */
  endHalf(clock: ClockState): Promise<void>;
  /** Zeroes both scores and clears the goal list. */
  resetScores(): Promise<void>;
  /** Bumps the score and logs the goal, in one write. What's on air doesn't change. */
  recordGoal(goal: GoalEvent): Promise<void>;
  /** Sets (or corrects) the scorer of the side's latest goal, based on the caller's `current` state. */
  setGoalScorer(current: MatchState, side: Side, playerId: string | null): Promise<void>;
  /** Lowers the side's score and drops its latest goal, based on the caller's `current` state. */
  removeLastGoal(current: MatchState, side: Side): Promise<void>;
}

export interface TeamsApi {
  /** All teams, sorted by name. */
  subscribeAll(onChange: (teams: TeamProfile[]) => void): Unsubscribe;
  /** One team; null if it doesn't exist (e.g. deleted while selected). */
  subscribe(id: string, onChange: (team: TeamProfile | null) => void): Unsubscribe;
  /** Returns the new id at once; the write itself may still be pending. Stamps `updatedAtMs`. */
  create(fields?: Partial<TeamEditableFields>): string;
  /** Stamps `updatedAtMs`. Edits show on air at once. */
  update(id: string, fields: Partial<TeamEditableFields>): Promise<void>;
  /**
   * Repairs the squad counts (null on older teams, or drifted), from the whole squad as
   * loaded by the caller (see staleTeamStats in squad.ts). Doesn't stamp `updatedAtMs`.
   * A failed repair (e.g. the team was deleted meanwhile) is only logged: it never rejects.
   */
  setStats(id: string, stats: { playerCount: number; missingPhotos: number }): Promise<void>;
  /**
   * Deletes the team and its players. Pass `playerIds` (the caller's loaded squad) so it
   * works offline; without them it reads the players from the server.
   */
  remove(id: string, playerIds?: string[]): Promise<void>;
}

export interface PlayersApi {
  /** Players of the given teams, sorted by name. Calls back with [] for no teams. */
  subscribe(teamIds: string[], onChange: (players: Player[]) => void): Unsubscribe;
  /**
   * Returns the new id at once; the write itself may still be pending. Bumps the team's
   * `playerCount` (and `missingPhotos` without a photo) in a separate write, so a missing
   * team can't fail the player; a missed bump is repaired from the squad (staleTeamStats).
   */
  create(fields: PlayerFields): string;
  /**
   * `current` is the player as the caller sees it: the team's `missingPhotos` follows a photo
   * being added or removed, and both teams' counts follow a change of `teamId` (separate
   * writes, see `create`). Undefined fields are ignored.
   */
  update(current: Player, fields: Partial<PlayerFields>): Promise<void>;
  /** Deletes the player and lowers its team's counts (separate write, see `create`). */
  remove(player: Player): Promise<void>;
}

/** The account's own sponsors (not any team's), for the Sponsors scene. */
export interface SponsorsApi {
  /** All sponsors, in list order (see compareSponsors). */
  subscribe(onChange: (sponsors: Sponsor[]) => void): Unsubscribe;
  /** Returns the new id at once; the write itself may still be pending. */
  create(fields?: Partial<SponsorFields>): string;
  update(id: string, fields: Partial<SponsorFields>): Promise<void>;
  /**
   * Saves a new list order (main first, then partners): each id gets its position in
   * `orderedIds`, in one batch. Pass `current` (the list as the caller sees it) so only
   * sponsors whose `order` changes are written; without it every id is written.
   */
  reorder(orderedIds: string[], current?: readonly Sponsor[]): Promise<void>;
  /**
   * Moves a sponsor, possibly into another tier (drag between tiers): sets its `tier` and
   * saves `orderedIds` as in `reorder`, in one batch, so it never shows in the new tier at
   * its old position. `current` as in `reorder`.
   */
  place(id: string, tier: SponsorTier, orderedIds: string[], current?: readonly Sponsor[]): Promise<void>;
  /** Bulk edit (tier, hidden) of the selected sponsors, in batches of up to 450. Edits show on air at once. */
  updateMany(ids: string[], fields: Partial<{ tier: SponsorTier; hidden: boolean }>): Promise<void>;
  remove(id: string): Promise<void>;
  /** Deletes the selected sponsors, in batches of up to 450. */
  removeMany(ids: string[]): Promise<void>;
}

export interface ScenesApi {
  /** All scene configs (on air), with defaults for any not customised yet. Changed only through `graphicsDraft.publish`. */
  subscribe(onChange: (scenes: SceneConfigs) => void): Unsubscribe;
}

export interface GraphicsApi {
  /** The look of every scene (theme and colours), with defaults when it was never saved. Changed only through `graphicsDraft.publish`. */
  subscribe(onChange: (graphics: GraphicsSettings) => void): Unsubscribe;
}

/**
 * The Graphics page's saved-but-not-on-air changes (see graphicsDraft.ts). One draft per
 * workspace, shared by every signed-in control page. Every write is one atomic batch,
 * offline-safe (no server reads).
 */
export interface GraphicsDraftApi {
  /** The stored draft; `EMPTY_DRAFT` when there is none. */
  subscribe(onChange: (draft: GraphicsDraft) => void): Unsubscribe;
  /**
   * Stores `next` (normally `diffDraft(onAir, shown)`): only the patches that differ from
   * `stored` (the draft as last received from `subscribe`) are written, an empty patch
   * deletes its doc. Nothing goes on air.
   */
  save(next: GraphicsDraft, stored: GraphicsDraft): Promise<void>;
  /**
   * Puts the draft on air: each non-empty patch's fields replace those of its on-air doc
   * (graphics, scene; `colors` whole, other fields kept) and the draft is cleared, in one write. A null image clears it on air. Stale
   * fields just rewrite the on-air value; pass `draftChanges(onAir, draft)` to skip them.
   */
  publish(draft: GraphicsDraft): Promise<void>;
  /** Drops the whole draft. */
  discard(): Promise<void>;
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
