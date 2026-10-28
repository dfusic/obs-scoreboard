import { deleteDoc, doc, increment, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { comparePlayers, normalizePlayer } from "../normalize";
import { withoutUndefined } from "../objects";
import { playerStatDeltas, type TeamStatDelta } from "../squad";
import type { PlayersApi } from "../store/types";
import type { PlayerFields } from "../types";
import { logSubscriptionError, playerRef, playersCol, teamRef } from "./workspace";

/**
 * Adjusts the teams' denormalized squad counts with atomic `increment` (offline-safe, several
 * devices). Written apart from the player, on purpose: in one batch, a team doc that is
 * missing (deleted elsewhere, not synced yet) would fail the player write too, and a merge
 * write would bring a deleted team back as a nameless doc. A failed bump only leaves a
 * count off, which the Teams page repairs from the loaded squad (staleTeamStats), so it is
 * logged instead of raised. Older teams without counts start from the delta; same repair.
 */
function bumpTeams(deltas: TeamStatDelta[]) {
  for (const { teamId, playerCount, missingPhotos } of deltas) {
    const fields: Record<string, ReturnType<typeof increment>> = {};
    if (playerCount) fields.playerCount = increment(playerCount);
    if (missingPhotos) fields.missingPhotos = increment(missingPhotos);
    updateDoc(teamRef(teamId), fields).catch((err) => console.warn(`Squad count of team ${teamId} not updated:`, err));
  }
}

export const playersApi: PlayersApi = {
  // Each player is its own doc (photos are inline), so only subscribe to the teams you need.
  subscribe(teamIds, onChange) {
    const ids = [...new Set(teamIds)];
    if (ids.length === 0) {
      onChange([]);
      return () => {};
    }
    return onSnapshot(
      query(playersCol(), where("teamId", "in", ids)),
      (snap) => {
        const players = snap.docs.map((d) => normalizePlayer(d.id, d.data() as Partial<PlayerFields>));
        onChange(players.sort(comparePlayers));
      },
      logSubscriptionError("Players"),
    );
  },

  create(fields) {
    const ref = doc(playersCol());
    const player = { teamId: fields.teamId, name: fields.name, photo: fields.photo ?? null };
    void setDoc(ref, player);
    bumpTeams(playerStatDeltas(null, player));
    return ref.id;
  },

  async update(current, fields) {
    const changes = withoutUndefined(fields);
    if (Object.keys(changes).length === 0) return;
    bumpTeams(playerStatDeltas(current, { ...current, ...changes }));
    await updateDoc(playerRef(current.id), changes);
  },

  async remove(player) {
    bumpTeams(playerStatDeltas(player, null));
    await deleteDoc(playerRef(player.id));
  },
};
