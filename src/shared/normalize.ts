import {
  createInitialMatchState,
  defaultSceneConfigs,
  NEW_TEAM,
  SCENE_TYPES,
  type MatchState,
  type Player,
  type PlayerFields,
  type SceneConfig,
  type SceneConfigs,
  type SceneType,
  type Side,
  type TeamFields,
  type TeamProfile,
} from "./types";

/**
 * Schema evolution: every backend merges stored data over the defaults, so data
 * written by an older version of the app still renders. Add new fields here.
 */

const isSide = (v: unknown): v is Side => v === "home" || v === "away";
const idList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((id) => typeof id === "string") : []);

export function normalizeMatch(data: Partial<MatchState> | undefined): MatchState {
  const initial = createInitialMatchState();
  const program = { ...initial.program, ...data?.program };
  return {
    score: { ...initial.score, ...data?.score },
    clock: {
      running: data?.clock?.running ?? initial.clock.running,
      startEpochMs: data?.clock?.startEpochMs ?? initial.clock.startEpochMs,
      accumulatedMs: data?.clock?.accumulatedMs ?? initial.clock.accumulatedMs,
    },
    teams: { ...initial.teams, ...data?.teams },
    lineup: { home: idList(data?.lineup?.home), away: idList(data?.lineup?.away) },
    awayPlayers: data?.awayPlayers ?? initial.awayPlayers,
    goals: Array.isArray(data?.goals) ? data.goals.filter((g) => isSide(g?.side)) : [],
    program: SCENE_TYPES.includes(program.scene) ? program : initial.program,
  };
}

export function normalizeTeam(id: string, data: Partial<TeamFields>): TeamProfile {
  return { ...NEW_TEAM, ...data, id };
}

export function normalizePlayer(id: string, data: Partial<PlayerFields>): Player {
  return { id, teamId: data.teamId ?? "", name: data.name ?? "", photo: data.photo ?? null };
}

/** All scene templates, with defaults for any not customised yet. Unknown scene ids are dropped. */
export function normalizeScenes(stored: Iterable<[string, Partial<SceneConfig>]>): SceneConfigs {
  const scenes = defaultSceneConfigs();
  for (const [id, data] of stored) {
    if ((SCENE_TYPES as readonly string[]).includes(id)) {
      const type = id as SceneType;
      scenes[type] = { ...scenes[type], ...data };
    }
  }
  return scenes;
}

/** Squad order (outside a match lineup): by name. */
export function comparePlayers(a: Player, b: Player): number {
  return a.name.localeCompare(b.name);
}

export function compareTeams(a: TeamProfile, b: TeamProfile): number {
  return a.name.localeCompare(b.name);
}
