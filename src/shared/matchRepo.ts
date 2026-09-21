import { doc, onSnapshot, runTransaction, setDoc, updateDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import { createInitialMatchState, type ClockState, type MatchState, type Team } from "./types";

const MATCH_ID = "current";
const matchRef = doc(db, "matches", MATCH_ID);

/** Fills in anything missing (e.g. a doc written by an older version of the app). */
function normalize(data: Partial<MatchState> | undefined): MatchState {
  const initial = createInitialMatchState();
  return {
    score: { ...initial.score, ...data?.score },
    clock: {
      running: data?.clock?.running ?? initial.clock.running,
      startEpochMs: data?.clock?.startEpochMs ?? initial.clock.startEpochMs,
      accumulatedMs: data?.clock?.accumulatedMs ?? initial.clock.accumulatedMs,
    },
    logos: { ...initial.logos, ...data?.logos },
  };
}

export function subscribeToMatch(onChange: (state: MatchState) => void): Unsubscribe {
  return onSnapshot(matchRef, (snap) => {
    onChange(normalize(snap.exists() ? (snap.data() as Partial<MatchState>) : undefined));
  });
}

/** Creates the match doc with initial state if it doesn't exist yet. Call once from the control page. */
export async function ensureMatchInitialized(): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) {
      tx.set(matchRef, createInitialMatchState());
    }
  });
}

/** Overwrites the doc, which also drops fields left over from older versions. */
export async function resetMatch(): Promise<void> {
  await setDoc(matchRef, createInitialMatchState());
}

export async function updateClock(clock: ClockState): Promise<void> {
  await updateDoc(matchRef, { clock });
}

export async function setScore(team: Team, value: number): Promise<void> {
  await updateDoc(matchRef, { [`score.${team}`]: Math.max(0, value) });
}

export async function setLogo(team: Team, logoUrl: string | null): Promise<void> {
  await updateDoc(matchRef, { [`logos.${team}`]: logoUrl });
}
