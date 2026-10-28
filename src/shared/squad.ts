import type { Player, TeamProfile, TeamStats } from "./types";

/** A squad's counts as stored on its team (TeamProfile.playerCount / missingPhotos). */
/** Squad counts of a loaded squad (never null, unlike a team's stored ones). */
export interface SquadStats {
  playerCount: number;
  missingPhotos: number;
}

export function squadStats(players: readonly Pick<Player, "photo">[]): SquadStats {
  return { playerCount: players.length, missingPhotos: players.filter((p) => !p.photo).length };
}

/**
 * The counts to write back when the team's stored ones are missing (older teams) or have
 * drifted from its loaded squad; null when they're right. Call it only with the whole squad
 * loaded, and write the result with `store.teams.setStats()`.
 */
export function staleTeamStats(team: TeamStats, players: readonly Pick<Player, "photo">[]): SquadStats | null {
  const stats = squadStats(players);
  return stats.playerCount === team.playerCount && stats.missingPhotos === team.missingPhotos ? null : stats;
}

/** Team-card sort for "Recently edited": newest first, teams never stamped last (by name). */
export function compareRecentlyEdited(a: TeamProfile, b: TeamProfile): number {
  return (b.updatedAtMs ?? -1) - (a.updatedAtMs ?? -1) || a.name.localeCompare(b.name);
}

/** A change to one team's squad counts. */
export interface TeamStatDelta {
  teamId: string;
  playerCount: number;
  missingPhotos: number;
}

type SquadMember = Pick<Player, "teamId" | "photo">;

/**
 * How a player write changes the teams' squad counts: `before` null for a create, `after`
 * null for a delete; for an update, `after` is the player with the (undefined-free) fields
 * applied. Only non-zero changes, for teams with an id.
 */
export function playerStatDeltas(before: SquadMember | null, after: SquadMember | null): TeamStatDelta[] {
  const missing = (p: SquadMember) => (p.photo ? 0 : 1);
  const deltas = new Map<string, TeamStatDelta>();
  const add = (p: SquadMember | null, sign: 1 | -1) => {
    if (!p?.teamId) return;
    const d = deltas.get(p.teamId) ?? { teamId: p.teamId, playerCount: 0, missingPhotos: 0 };
    d.playerCount += sign;
    d.missingPhotos += sign * missing(p);
    deltas.set(p.teamId, d);
  };
  add(before, -1);
  add(after, 1);
  return [...deltas.values()].filter((d) => d.playerCount !== 0 || d.missingPhotos !== 0);
}
