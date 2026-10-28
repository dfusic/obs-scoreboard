import { writeBatch, type WriteBatch } from "firebase/firestore";
import { db } from "./firebase";

/** Firestore allows 500 writes per batch; stay well under it. */
export const MAX_BATCH_OPS = 450;

/**
 * Commits the writes in as few batches as possible (each atomic on its own). Batches, not
 * transactions: they apply locally at once and sync on reconnect.
 */
export async function commitInChunks(writes: readonly ((batch: WriteBatch) => void)[]): Promise<void> {
  const commits: Promise<void>[] = [];
  for (let i = 0; i < writes.length; i += MAX_BATCH_OPS) {
    const batch = writeBatch(db);
    writes.slice(i, i + MAX_BATCH_OPS).forEach((write) => write(batch));
    commits.push(batch.commit());
  }
  await Promise.all(commits);
}
