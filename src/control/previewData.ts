import { matchPlayers, type LiveData } from "@shared/liveFeed";
import { SCENE_TYPES, type OnAirGraphics, type Player, type SceneConfigs, type SceneType } from "@shared/types";

/**
 * What the control page posts to its preview iframes, kept small: images are inline data
 * URLs (player photos, logos, backgrounds), and every posted message is structured-cloned
 * into the iframe's heap. Pure, tested in previewData.test.ts.
 */

/** Scenes that show a player's photo (the player intro design). */
const PHOTO_SCENES: ReadonlySet<SceneType> = new Set(["presentation", "playerCard"]);

/**
 * The `preview-data` for a static thumbnail of one scene: `data` with the `shown` look and
 * scene configs, trimmed to what that scene renders. Player photos only for the intro /
 * player card's player (the one the output would pick: the program's, else the side's first
 * match player); other scenes' backgrounds and logos dropped; sponsors only for the sponsors
 * scene. Names, teams, score and goals stay (scorers are listed by name).
 */
export function thumbnailData(data: LiveData, shown: OnAirGraphics, scene: SceneType): LiveData {
  const { program } = data.match;
  const side = program.side ?? "home";
  const photoId = PHOTO_SCENES.has(scene)
    ? program.playerId && data.players.has(program.playerId)
      ? program.playerId
      : (matchPlayers(data, side)[0]?.id ?? null)
    : null;
  const slim = (p: Player): Player => (p.photo && p.id !== photoId ? { ...p, photo: null } : p);
  const players = new Map([...data.players].map(([id, p]) => [id, slim(p)]));
  const list = (ps: Player[]) => ps.map((p) => players.get(p.id) ?? slim(p));

  const scenes = {} as SceneConfigs;
  for (const type of SCENE_TYPES) {
    const config = shown.scenes[type];
    scenes[type] = type === scene ? config : { ...config, background: null, logo: null };
  }

  return {
    ...data,
    players,
    squads: { home: list(data.squads.home), away: list(data.squads.away) },
    lineups: { home: list(data.lineups.home), away: list(data.lineups.away) },
    scenes,
    sponsors: scene === "sponsors" ? data.sponsors : [],
    graphics: shown.graphics,
  };
}

/** Strings longer than this (data URLs) are keyed by length and tail instead of in full. */
const LONG_STRING = 256;

/**
 * A cheap fingerprint of a message payload, to post it only when its content changed
 * (snapshots rebuild objects that are often equal). Data URLs count by length and tail,
 * Maps by their entries.
 */
export function contentKey(value: unknown): string {
  return (
    JSON.stringify(value, (_key, v: unknown) => {
      if (v instanceof Map) return [...v];
      if (typeof v === "string" && v.length > LONG_STRING) return `#${v.length}:${v.slice(-48)}`;
      return v;
    }) ?? ""
  );
}
