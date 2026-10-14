import { doc, getDocs, onSnapshot, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { compareTeams, normalizeTeam } from "../normalize";
import type { TeamsApi } from "../store/types";
import { NEW_TEAM, type TeamFields } from "../types";
import { db } from "./firebase";
import { logSubscriptionError, playersCol, teamRef, teamsCol } from "./workspace";

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
    void setDoc(ref, { ...NEW_TEAM, ...fields });
    return ref.id;
  },

  async update(id, fields) {
    await updateDoc(teamRef(id), fields);
  },

  async remove(id) {
    const players = await getDocs(query(playersCol(), where("teamId", "==", id)));
    const batch = writeBatch(db);
    players.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(teamRef(id));
    await batch.commit();
  },
};
