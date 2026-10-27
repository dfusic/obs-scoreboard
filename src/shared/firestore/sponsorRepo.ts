import { deleteDoc, doc, onSnapshot, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { normalizeSponsor } from "../normalize";
import { compareSponsors } from "../sponsors";
import type { SponsorsApi } from "../store/types";
import { NEW_SPONSOR, type SponsorFields } from "../types";
import { db } from "./firebase";
import { logSubscriptionError, sponsorRef, sponsorsCol } from "./workspace";

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
    void setDoc(ref, { ...NEW_SPONSOR, ...fields });
    return ref.id;
  },

  async update(id, fields) {
    await updateDoc(sponsorRef(id), fields);
  },

  // A batch, not a transaction: it applies locally at once and syncs on reconnect.
  async reorder(ids) {
    const batch = writeBatch(db);
    ids.forEach((id, order) => batch.update(sponsorRef(id), { order }));
    await batch.commit();
  },

  async remove(id) {
    await deleteDoc(sponsorRef(id));
  },
};
