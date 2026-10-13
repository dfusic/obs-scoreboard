import { resolveLineup } from "./lineup";
import { subscribeToMatch } from "./matchRepo";
import { subscribeToPlayers } from "./playerRepo";
import { defaultSceneConfigs, subscribeToScenes, type SceneConfigs } from "./sceneRepo";
import { subscribeToTeam } from "./teamRepo";
import { SIDES, type MatchState, type Player, type Side, type TeamProfile } from "./types";

/** Everything needed to render or operate the live match. */
export interface LiveData {
  match: MatchState;
  teams: Record<Side, TeamProfile | null>;
  /** Players of the match teams, by id. */
  players: Map<string, Player>;
  /** Whole squad of each side, by name. Empty for away while `match.awayPlayers` is off. */
  squads: Record<Side, Player[]>;
  /** Players ticked as playing, in presentation order. */
  lineups: Record<Side, Player[]>;
  scenes: SceneConfigs;
}

/** Players available to scenes and pickers: the lineup once one is picked, else the whole squad. */
export function matchPlayers(data: LiveData, side: Side): Player[] {
  return data.lineups[side].length ? data.lineups[side] : data.squads[side];
}

/** Sides whose players are used: home always, away only when its squad is available. */
export function sidesWithPlayers(match: MatchState): Side[] {
  return match.awayPlayers ? ["home", "away"] : ["home"];
}

/**
 * Subscribes to the live match plus only the data it references: the two selected
 * teams, their players (re-subscribed when the teams change) and the scene templates.
 * Calls back on every change once the match has loaded.
 */
export function subscribeToLive(onChange: (data: LiveData) => void): () => void {
  let match: MatchState | null = null;
  let scenes = defaultSceneConfigs();
  const teams: Record<Side, TeamProfile | null> = { home: null, away: null };
  let players: Player[] = [];

  // Teams and players are re-subscribed separately, so toggling away players doesn't blank the logos.
  let teamsKey: string | null = null;
  let teamSubs: (() => void)[] = [];
  let playersKey: string | null = null;
  let playersSub: () => void = () => {};

  const emit = () => {
    if (!match) return;
    const m = match;
    const byId = new Map(players.map((p) => [p.id, p]));
    const used = sidesWithPlayers(m);
    const squad = (side: Side) =>
      used.includes(side) && m.teams[side] ? players.filter((p) => p.teamId === m.teams[side]) : [];
    const lineup = (side: Side) => (used.includes(side) ? resolveLineup(m.lineup[side], byId) : []);
    onChange({
      match: m,
      teams: { ...teams },
      players: byId,
      squads: { home: squad("home"), away: squad("away") },
      lineups: { home: lineup("home"), away: lineup("away") },
      scenes,
    });
  };

  const resubscribeTeams = (m: MatchState) => {
    teamSubs.forEach((unsub) => unsub());
    teams.home = teams.away = null;
    teamSubs = SIDES.flatMap((side) => {
      const id = m.teams[side];
      return id
        ? [
            subscribeToTeam(id, (team) => {
              teams[side] = team;
              emit();
            }),
          ]
        : [];
    });
  };

  const resubscribePlayers = (teamIds: string[]) => {
    playersSub();
    players = [];
    playersSub = subscribeToPlayers(teamIds, (list) => {
      players = list;
      emit();
    });
  };

  const unsubMatch = subscribeToMatch((next) => {
    match = next;
    const nextTeamsKey = `${next.teams.home}|${next.teams.away}`;
    if (nextTeamsKey !== teamsKey) {
      teamsKey = nextTeamsKey;
      resubscribeTeams(next);
    }
    const teamIds = sidesWithPlayers(next)
      .map((side) => next.teams[side])
      .filter((id): id is string => id !== null);
    if (teamIds.join("|") !== playersKey) {
      playersKey = teamIds.join("|");
      resubscribePlayers(teamIds);
    }
    emit();
  });

  const unsubScenes = subscribeToScenes((next) => {
    scenes = next;
    emit();
  });

  return () => {
    unsubMatch();
    unsubScenes();
    teamSubs.forEach((unsub) => unsub());
    playersSub();
  };
}
