import { addDoc, deleteDoc, onSnapshot, query, updateDoc, where, type Unsubscribe } from "firebase/firestore";
import type { Player } from "./types";
import { playerRef, playersCol, logSubscriptionError } from "./workspace";

export type PlayerFields = Omit<Player, "id">;

function normalize(id: string, data: Partial<PlayerFields>): Player {
  return { id, teamId: data.teamId ?? "", name: data.name ?? "", photo: data.photo ?? null };
}

/** Squad order (outside a match lineup): by name. */
export function comparePlayers(a: Player, b: Player): number {
  return a.name.localeCompare(b.name);
}

/**
 * Players of the given teams, sorted. Each player is its own doc (photos are inline),
 * so only subscribe to the teams you need. Calls back with [] for no teams.
 */
export function subscribeToPlayers(teamIds: string[], onChange: (players: Player[]) => void): Unsubscribe {
  const ids = [...new Set(teamIds)];
  if (ids.length === 0) {
    onChange([]);
    return () => {};
  }
  return onSnapshot(query(playersCol(), where("teamId", "in", ids)), (snap) => {
    const players = snap.docs.map((d) => normalize(d.id, d.data() as Partial<PlayerFields>));
    onChange(players.sort(comparePlayers));
  }, logSubscriptionError("Players"));
}

export async function createPlayer(fields: PlayerFields): Promise<string> {
  const ref = await addDoc(playersCol(), fields);
  return ref.id;
}

export async function updatePlayer(id: string, fields: Partial<PlayerFields>): Promise<void> {
  await updateDoc(playerRef(id), fields);
}

export async function deletePlayer(id: string): Promise<void> {
  await deleteDoc(playerRef(id));
}
