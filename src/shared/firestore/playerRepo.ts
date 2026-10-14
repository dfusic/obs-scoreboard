import { deleteDoc, doc, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { comparePlayers, normalizePlayer } from "../normalize";
import type { PlayersApi } from "../store/types";
import type { PlayerFields } from "../types";
import { logSubscriptionError, playerRef, playersCol } from "./workspace";

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
    void setDoc(ref, fields);
    return ref.id;
  },

  async update(id, fields) {
    await updateDoc(playerRef(id), fields);
  },

  async remove(id) {
    await deleteDoc(playerRef(id));
  },
};
