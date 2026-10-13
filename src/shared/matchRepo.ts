import { onSnapshot, runTransaction, setDoc, updateDoc, type Transaction, type Unsubscribe } from "firebase/firestore";
import { computeElapsedMs } from "./clock";
import { db } from "./firebase";
import {
  createInitialMatchState,
  SCENE_TYPES,
  type ClockState,
  type GoalEvent,
  type MatchState,
  type ProgramState,
  type Side,
} from "./types";
import { liveMatchRef } from "./workspace";

const isSide = (v: unknown): v is Side => v === "home" || v === "away";
const idList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((id) => typeof id === "string") : []);

/** Fills in anything missing (e.g. a doc written by an older version of the app). */
function normalize(data: Partial<MatchState> | undefined): MatchState {
  const initial = createInitialMatchState();
  const program = { ...initial.program, ...data?.program };
  return {
    score: { ...initial.score, ...data?.score },
    clock: {
      running: data?.clock?.running ?? initial.clock.running,
      startEpochMs: data?.clock?.startEpochMs ?? initial.clock.startEpochMs,
      accumulatedMs: data?.clock?.accumulatedMs ?? initial.clock.accumulatedMs,
    },
    teams: { ...initial.teams, ...data?.teams },
    lineup: { home: idList(data?.lineup?.home), away: idList(data?.lineup?.away) },
    awayPlayers: data?.awayPlayers ?? initial.awayPlayers,
    goals: Array.isArray(data?.goals) ? data.goals.filter((g) => isSide(g?.side)) : [],
    program: SCENE_TYPES.includes(program.scene) ? program : initial.program,
  };
}

export function subscribeToMatch(onChange: (state: MatchState) => void): Unsubscribe {
  return onSnapshot(
    liveMatchRef(),
    (snap) => onChange(normalize(snap.exists() ? (snap.data() as Partial<MatchState>) : undefined)),
    (err) => console.error("Live match subscription failed:", err),
  );
}

/**
 * Updates match fields. If the doc is missing (never created, or deleted while pages were
 * open) it is recreated with initial state first, instead of the write silently failing.
 */
async function updateMatch(fields: Record<string, unknown>): Promise<void> {
  try {
    await updateDoc(liveMatchRef(), fields);
  } catch (err) {
    if ((err as { code?: string }).code !== "not-found") throw err;
    await ensureMatchInitialized();
    await updateDoc(liveMatchRef(), fields);
  }
}

/** Transaction write with the same fallback: creates the doc first when it doesn't exist. */
function txUpdateMatch(tx: Transaction, exists: boolean, fields: Record<string, unknown>): void {
  if (!exists) tx.set(liveMatchRef(), createInitialMatchState());
  tx.update(liveMatchRef(), fields);
}

/** Creates the match doc with initial state if it doesn't exist yet. Call once from the control page. */
export async function ensureMatchInitialized(): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(liveMatchRef());
    if (!snap.exists()) {
      tx.set(liveMatchRef(), createInitialMatchState());
    }
  });
}

/** Overwrites the doc (dropping stale fields), keeping the pre-match setup: teams and lineups. */
export async function resetMatch(match: MatchState): Promise<void> {
  const { teams, lineup, awayPlayers } = match;
  await setDoc(liveMatchRef(), { ...createInitialMatchState(), teams, lineup, awayPlayers });
}

export async function updateClock(clock: ClockState): Promise<void> {
  await updateMatch({ clock });
}

/** Picks a side's team; its lineup starts empty since the old one belonged to another squad. */
export async function setMatchTeam(side: Side, teamId: string | null): Promise<void> {
  await updateMatch({ [`teams.${side}`]: teamId, [`lineup.${side}`]: [] });
}

/** Players ticked as playing, in presentation order. */
export async function setLineup(side: Side, playerIds: string[]): Promise<void> {
  await updateMatch({ [`lineup.${side}`]: playerIds });
}

export async function setAwayPlayers(enabled: boolean): Promise<void> {
  await updateMatch({ awayPlayers: enabled });
}

export async function setProgram(program: ProgramState): Promise<void> {
  await updateMatch({ program });
}

/** Zeroes both scores and clears the goal list. */
export async function resetScores(): Promise<void> {
  await updateMatch({ score: { home: 0, away: 0 }, goals: [] });
}

/**
 * Adds a goal: bumps the score, logs the scorer at the current match time and,
 * if `program` is given, puts the goal scene on air, all in one write.
 */
export async function recordGoal(side: Side, playerId: string | null, program: ProgramState | null): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(liveMatchRef());
    const match = normalize(snap.data() as Partial<MatchState> | undefined);
    const goal: GoalEvent = { side, playerId, elapsedMs: computeElapsedMs(match.clock, Date.now()) };
    txUpdateMatch(tx, snap.exists(), {
      [`score.${side}`]: match.score[side] + 1,
      goals: [...match.goals, goal],
      ...(program ? { program } : {}),
    });
  });
}

/** Takes a goal back: lowers the score and drops that side's most recent goal. */
export async function removeLastGoal(side: Side): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(liveMatchRef());
    const match = normalize(snap.data() as Partial<MatchState> | undefined);
    const lastIndex = match.goals.map((g) => g.side).lastIndexOf(side);
    txUpdateMatch(tx, snap.exists(), {
      [`score.${side}`]: Math.max(0, match.score[side] - 1),
      goals: lastIndex === -1 ? match.goals : match.goals.filter((_, i) => i !== lastIndex),
    });
  });
}
