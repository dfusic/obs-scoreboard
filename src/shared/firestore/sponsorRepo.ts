import { deleteDoc, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { normalizeSponsor } from "../normalize";
import { withoutUndefined } from "../objects";
import { compareSponsors, sponsorOrderWrites, type SponsorWrite } from "../sponsors";
import type { SponsorsApi } from "../store/types";
import { NEW_SPONSOR, type SponsorFields } from "../types";
import { commitInChunks } from "./batch";
import { logSubscriptionError, sponsorRef, sponsorsCol } from "./workspace";

/** One batch (up to 450 sponsors), so a move between tiers is never half applied. */
function commitSponsorWrites(writes: SponsorWrite[]) {
  return commitInChunks(writes.map(({ id, fields }) => (batch) => batch.update(sponsorRef(id), fields)));
}

export const sponsorsApi: SponsorsApi = {
  subscribe(onChange) {
    return onSnapshot(
      sponsorsCol(),
      (snap) => {
        const sponsors = snap.docs.map((d) => normalizeSponsor(d.id, d.data() as Partial<SponsorFields>));
        onChange(sponsors.sort(compareSponsors));
      },
      logSubscriptionError("Sponsors"),
    );
  },

  create(fields = {}) {
    const ref = doc(sponsorsCol());
    void setDoc(ref, { ...NEW_SPONSOR, ...withoutUndefined(fields) });
    return ref.id;
  },

  async update(id, fields) {
    const changes = withoutUndefined(fields);
    if (Object.keys(changes).length) await updateDoc(sponsorRef(id), changes);
  },

  // Batches, not a transaction: they apply locally at once and sync on reconnect.
  async reorder(orderedIds, current) {
    await commitSponsorWrites(sponsorOrderWrites(orderedIds, current));
  },

  async place(id, tier, orderedIds, current) {
    await commitSponsorWrites(sponsorOrderWrites(orderedIds, current, { id, tier }));
  },

  async updateMany(ids, fields) {
    const changes = withoutUndefined(fields);
    if (Object.keys(changes).length === 0) return;
    await commitInChunks(ids.map((id) => (batch) => batch.update(sponsorRef(id), changes)));
  },

  async remove(id) {
    await deleteDoc(sponsorRef(id));
  },

  async removeMany(ids) {
    await commitInChunks(ids.map((id) => (batch) => batch.delete(sponsorRef(id))));
  },
};
