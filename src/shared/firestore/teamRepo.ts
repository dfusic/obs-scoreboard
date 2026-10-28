import { doc, getDocs, onSnapshot, query, setDoc, updateDoc, where, type WriteBatch } from "firebase/firestore";
import { compareTeams, normalizeTeam } from "../normalize";
import { withoutUndefined } from "../objects";
import type { TeamsApi } from "../store/types";
import { NEW_TEAM, type TeamFields } from "../types";
import { commitInChunks } from "./batch";
import { logSubscriptionError, playerRef, playersCol, teamRef, teamsCol } from "./workspace";

export const teamsApi: TeamsApi = {
  subscribeAll(onChange) {
    return onSnapshot(
      teamsCol(),
      (snap) => {
        const teams = snap.docs.map((d) => normalizeTeam(d.id, d.data() as Partial<TeamFields>));
        onChange(teams.sort(compareTeams));
      },
      logSubscriptionError("Teams"),
    );
  },

  subscribe(id, onChange) {
    return onSnapshot(
      teamRef(id),
      (snap) => onChange(snap.exists() ? normalizeTeam(snap.id, snap.data() as Partial<TeamFields>) : null),
      logSubscriptionError("Team"),
    );
  },

  create(fields = {}) {
    const ref = doc(teamsCol());
    void setDoc(ref, { ...NEW_TEAM, ...withoutUndefined(fields), updatedAtMs: Date.now() });
    return ref.id;
  },

  async update(id, fields) {
    await updateDoc(teamRef(id), { ...withoutUndefined(fields), updatedAtMs: Date.now() });
  },

  // A background repair, fired with `void`: a team deleted meanwhile must not surface as a
  // failed save, and the next squad load repairs it again anyway.
  async setStats(id, { playerCount, missingPhotos }) {
    await updateDoc(teamRef(id), { playerCount, missingPhotos }).catch((err) =>
      console.warn(`Squad counts of team ${id} not repaired:`, err),
    );
  },

  async remove(id, playerIds) {
    // Without the caller's player list this falls back to a server read in a write path
    // (known gap, see architect.md): offline it only sees cached players.
    const ids = playerIds ?? (await getDocs(query(playersCol(), where("teamId", "==", id)))).docs.map((d) => d.id);
    // Up to 450 deletes per batch; a squad that size is one batch, team included.
    const writes: ((batch: WriteBatch) => void)[] = ids.map((pid) => (batch) => batch.delete(playerRef(pid)));
    writes.push((batch) => batch.delete(teamRef(id)));
    await commitInChunks(writes);
  },
};
