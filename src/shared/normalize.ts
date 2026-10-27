import { COLOR_SCHEMES, colorScheme, sameColors, sceneLayoutId, theme, themeColors, type SchemeColorKey } from "./themes";
import { secondsPerSponsor } from "./sponsors";
import { transition } from "./transitions";
import {
  createInitialMatchState,
  defaultSceneConfigs,
  NEW_SPONSOR,
  NEW_TEAM,
  SCENE_TYPES,
  type GraphicsSettings,
  type MatchState,
  type Player,
  type PlayerFields,
  type SceneConfig,
  type SceneConfigs,
  type SceneType,
  type Side,
  type Sponsor,
  type SponsorFields,
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
    half: data?.half === 2 ? 2 : 1,
  };
}

export function normalizeTeam(id: string, data: Partial<TeamFields>): TeamProfile {
  return { ...NEW_TEAM, ...data, id };
}

export function normalizePlayer(id: string, data: Partial<PlayerFields>): Player {
  return { id, teamId: data.teamId ?? "", name: data.name ?? "", photo: data.photo ?? null };
}

export function normalizeSponsor(id: string, data: Partial<SponsorFields>): Sponsor {
  return {
    id,
    name: typeof data.name === "string" ? data.name : NEW_SPONSOR.name,
    logo: typeof data.logo === "string" ? data.logo : null,
    tier: data.tier === "main" ? "main" : "partner",
    order: typeof data.order === "number" && Number.isFinite(data.order) ? data.order : NEW_SPONSOR.order,
  };
}

/**
 * All scene configs, with defaults for any not customised yet. Unknown scene ids are
 * dropped. The layout was stored as `template` before themes.
 */
export function normalizeScenes(
  stored: Iterable<[string, Partial<SceneConfig> & { template?: unknown }]>,
): SceneConfigs {
  const scenes = defaultSceneConfigs();
  for (const [id, data] of stored) {
    if ((SCENE_TYPES as readonly string[]).includes(id)) {
      const type = id as SceneType;
      const { template, ...fields } = data;
      scenes[type] = {
        ...scenes[type],
        ...fields,
        layout: sceneLayoutId(type, fields.layout ?? template),
        secondsPerSponsor: secondsPerSponsor(fields.secondsPerSponsor ?? scenes[type].secondsPerSponsor),
      };
    }
  }
  return scenes;
}

const isColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/**
 * Stored colours over the theme's defaults; an unknown theme falls back to Classic.
 * Settings saved before themes have `template` instead of `theme`: an old colour-variant
 * template (e.g. "forest") becomes the Dark theme with that scheme's colours as the
 * defaults. Settings saved before `highlight` take it from the scheme their other
 * colours match, else from the theme's scheme.
 */
export function normalizeGraphics(
  data: (Partial<GraphicsSettings> & { template?: unknown }) | undefined,
): GraphicsSettings {
  const stored = data?.theme ?? data?.template;
  const id = typeof stored === "string" ? stored : "";
  const t = theme(id);
  const legacyScheme = id !== t.id ? colorScheme(id) : undefined;
  const colors = legacyScheme ? { ...legacyScheme.colors } : themeColors(t);
  const storedColors = (data?.colors ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(colors) as SchemeColorKey[]) {
    const value = storedColors[key];
    if (isColor(value)) colors[key] = value;
    else if (key === "background" && value === null) colors.background = null;
  }
  if (!isColor(storedColors.highlight)) {
    const match = COLOR_SCHEMES.find((s) => sameColors(s.colors, { ...colors, highlight: s.colors.highlight }));
    if (match) colors.highlight = match.colors.highlight;
  }
  return { theme: t.id, colors, transition: transition(data?.transition).id };
}

/** Squad order (outside a match lineup): by name. */
export function comparePlayers(a: Player, b: Player): number {
  return a.name.localeCompare(b.name);
}

export function compareTeams(a: TeamProfile, b: TeamProfile): number {
  return a.name.localeCompare(b.name);
}
