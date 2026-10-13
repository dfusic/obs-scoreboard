import { addDoc, getDocs, onSnapshot, query, updateDoc, where, writeBatch, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import type { TeamProfile } from "./types";
import { playersCol, teamRef, teamsCol, logSubscriptionError } from "./workspace";

export type TeamFields = Omit<TeamProfile, "id">;

export const NEW_TEAM: TeamFields = {
  name: "New team",
  shortName: "",
  primaryColor: "#1e3a8a",
  secondaryColor: "#ffffff",
  logo: null,
};

function normalize(id: string, data: Partial<TeamFields>): TeamProfile {
  return { ...NEW_TEAM, ...data, id };
}

/** All teams, sorted by name. */
export function subscribeToTeams(onChange: (teams: TeamProfile[]) => void): Unsubscribe {
  return onSnapshot(teamsCol(), (snap) => {
    const teams = snap.docs.map((d) => normalize(d.id, d.data() as Partial<TeamFields>));
    onChange(teams.sort((a, b) => a.name.localeCompare(b.name)));
  }, logSubscriptionError("Teams"));
}

/** One team; null if it doesn't exist (e.g. deleted while selected). */
export function subscribeToTeam(id: string, onChange: (team: TeamProfile | null) => void): Unsubscribe {
  return onSnapshot(teamRef(id), (snap) => {
    onChange(snap.exists() ? normalize(snap.id, snap.data() as Partial<TeamFields>) : null);
  }, logSubscriptionError("Team"));
}

export async function createTeam(fields: Partial<TeamFields> = {}): Promise<string> {
  const ref = await addDoc(teamsCol(), { ...NEW_TEAM, ...fields });
  return ref.id;
}

export async function updateTeam(id: string, fields: Partial<TeamFields>): Promise<void> {
  await updateDoc(teamRef(id), fields);
}

/** Deletes the team and its players. */
export async function deleteTeam(id: string): Promise<void> {
  const players = await getDocs(query(playersCol(), where("teamId", "==", id)));
  const batch = writeBatch(db);
  players.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(teamRef(id));
  await batch.commit();
}
