import { arrayUnion, increment, onSnapshot, runTransaction, setDoc, updateDoc } from "firebase/firestore";
import { normalizeMatch } from "../normalize";
import type { MatchApi } from "../store/types";
import { createInitialMatchState, type MatchState } from "../types";
import { db } from "./firebase";
import { liveMatchRef, logSubscriptionError } from "./workspace";

/**
 * Updates match fields with dotted paths. If the doc is missing (never created, or deleted
 * while pages were open) it is recreated with initial state first, instead of the write
 * silently failing.
 */
async function updateMatch(fields: Record<string, unknown>): Promise<void> {
  try {
    await updateDoc(liveMatchRef(), fields);
  } catch (err) {
    if ((err as { code?: string }).code !== "not-found") throw err;
    await ensureInitialized();
    await updateDoc(liveMatchRef(), fields);
  }
}

/**
 * A transaction, so two control pages can't both create the doc. Transactions need the
 * server: offline this gives up quietly, and `updateMatch` recreates the doc on first write.
 */
async function ensureInitialized(): Promise<void> {
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(liveMatchRef());
      if (!snap.exists()) tx.set(liveMatchRef(), createInitialMatchState());
    });
  } catch (err) {
    if ((err as { code?: string }).code !== "unavailable") throw err;
    console.warn("Offline: skipped creating the match doc.");
  }
}

// No transactions below: they fail offline. Goals use atomic increment/arrayUnion instead,
// and undo works from the caller's snapshot (which already includes its own pending writes).
export const matchApi: MatchApi = {
  subscribe(onChange) {
    return onSnapshot(
      liveMatchRef(),
      (snap) => onChange(normalizeMatch(snap.exists() ? (snap.data() as Partial<MatchState>) : undefined)),
      logSubscriptionError("Live match"),
    );
  },

  ensureInitialized,

  // Overwrites the doc, which also drops stale fields from older versions.
  async reset({ teams, lineup, awayPlayers }) {
    await setDoc(liveMatchRef(), { ...createInitialMatchState(), teams, lineup, awayPlayers });
  },

  updateClock: (clock) => updateMatch({ clock }),
  setTeam: (side, teamId) => updateMatch({ [`teams.${side}`]: teamId, [`lineup.${side}`]: [] }),
  setLineup: (side, playerIds) => updateMatch({ [`lineup.${side}`]: playerIds }),
  setAwayPlayers: (enabled) => updateMatch({ awayPlayers: enabled }),
  setProgram: (program) => updateMatch({ program }),
  startHalf: (half, clock) => updateMatch({ half, clock }),
  endHalf: (clock, program) => updateMatch({ clock, ...(program ? { program } : {}) }),
  resetScores: () => updateMatch({ score: { home: 0, away: 0 }, goals: [] }),

  // Goals carry their ms timestamp, so arrayUnion never merges two real goals.
  recordGoal: (goal, program) =>
    updateMatch({
      [`score.${goal.side}`]: increment(1),
      goals: arrayUnion(goal),
      ...(program ? { program } : {}),
    }),

  removeLastGoal(current, side) {
    const lastIndex = current.goals.map((g) => g.side).lastIndexOf(side);
    return updateMatch({
      [`score.${side}`]: Math.max(0, current.score[side] - 1),
      goals: lastIndex === -1 ? current.goals : current.goals.filter((_, i) => i !== lastIndex),
    });
  },
};
