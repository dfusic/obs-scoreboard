import { useLiveData, useStore } from "@shared/react/store";
import { nextSponsorOrder } from "@shared/sponsors";
import type { Sponsor, SponsorTier } from "@shared/types";
import { useState, type ChangeEvent, type DragEvent } from "react";
import { nameFromFileName, processImage, SPONSOR_LOGO_IMAGE } from "../images";
import {
  Button,
  cn,
  CommitInput,
  ErrorText,
  hiddenFileInput,
  Hint,
  ICON,
  PageBody,
  PageHeader,
  Panel,
  PanelBody,
  PanelTitle,
  Thumb,
  UploadButton,
  useImageUpload,
} from "../ui";

/** Logos are PNGs with transparency; other formats are accepted and converted. */
const LOGO_ACCEPT = "image/png,image/*";

const sponsorRow = "grid grid-cols-[20px_52px_minmax(0,1fr)_auto_auto] items-center gap-2.5 max-[640px]:grid-cols-[20px_52px_minmax(0,1fr)]";

/** Moves `id` to where `targetId` is in `ids`. */
function moveId(ids: string[], id: string, targetId: string): string[] {
  const without = ids.filter((x) => x !== id);
  const at = without.indexOf(targetId);
  if (at < 0) return ids;
  // Dropped on a row below its old place: land after it, so dragging down one row works.
  const after = ids.indexOf(id) < ids.indexOf(targetId);
  without.splice(after ? at + 1 : at, 0, id);
  return without;
}

/**
 * Sponsors: the account's own sponsor list (never a team's), shown in the Sponsors scene
 * as logos only. Each sponsor comes from a logo file (one or many at once), named after it
 * for this list; set the tier, drag (or ▲▼) to reorder.
 */
export function SponsorsPage({ hidden }: { hidden: boolean }) {
  const store = useStore();
  const { sponsors } = useLiveData();
  const [status, setStatus] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const ids = sponsors.map((s) => s.id);

  const addFromLogos = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = [...(input.files ?? [])];
    if (files.length === 0) return;
    const failed: string[] = [];
    let order = nextSponsorOrder(sponsors);
    for (const [i, file] of files.entries()) {
      setStatus(`Adding ${i + 1} of ${files.length}...`);
      try {
        const logo = await processImage(file, SPONSOR_LOGO_IMAGE);
        store.sponsors.create({ name: nameFromFileName(file.name), logo, order: order++ });
      } catch {
        failed.push(file.name);
      }
    }
    setStatus(
      failed.length
        ? `Added ${files.length - failed.length}. Could not read: ${failed.join(", ")}`
        : `Added ${files.length} ${files.length === 1 ? "sponsor" : "sponsors"}. Check the names below.`,
    );
    input.value = "";
  };

  const reorder = (next: string[]) => void store.sponsors.reorder(next);
  const move = (id: string, by: -1 | 1) => {
    const at = ids.indexOf(id);
    const to = at + by;
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[at], next[to]] = [next[to], next[at]];
    reorder(next);
  };

  const endDrag = () => {
    setDragId(null);
    setOverId(null);
  };
  const onDrop = (targetId: string) => {
    if (dragId && dragId !== targetId) reorder(moveId(ids, dragId, targetId));
    endDrag();
  };

  const mainCount = sponsors.filter((s) => s.tier === "main").length;

  return (
    <div hidden={hidden}>
      <PageHeader title="Sponsors" sub="Your own sponsors, shown in the Sponsors scene whichever teams are playing">
        <div className="w-[220px]">
          <UploadButton accept={LOGO_ACCEPT} multiple onChange={addFromLogos}>
            Add sponsor logos
          </UploadButton>
        </div>
      </PageHeader>
      <PageBody>
        {status && <Hint>{status}</Hint>}
        {sponsors.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="font-condensed text-base font-bold tracking-[0.06em] text-dim uppercase">No sponsors yet</div>
            <Hint className="mt-1.5">
              Pick one or more logo files with "Add sponsor logos": each file becomes a sponsor.
            </Hint>
          </div>
        ) : (
          <Panel>
            <PanelTitle>
              {sponsors.length} {sponsors.length === 1 ? "sponsor" : "sponsors"} · {mainCount} main
            </PanelTitle>
            <PanelBody className="gap-1.5">
              {sponsors.map((s, i) => (
                <SponsorRow
                  key={s.id}
                  sponsor={s}
                  first={i === 0}
                  last={i === sponsors.length - 1}
                  dragging={dragId === s.id}
                  dropTarget={overId === s.id && dragId !== s.id}
                  onMove={(by) => move(s.id, by)}
                  onDragStart={() => setDragId(s.id)}
                  onDragOver={() => setOverId(s.id)}
                  onDrop={() => onDrop(s.id)}
                  onDragEnd={endDrag}
                />
              ))}
            </PanelBody>
          </Panel>
        )}
        <Hint>
          The scene shows the logos only, never names: transparent PNGs that read on a dark background (white or
          negative versions) work best. Main sponsors are shown larger, above the partners; each tier keeps this order.
          Drag a row by its handle (or use ▲▼) to reorder. The name is a label for this list, taken from the file name.
        </Hint>
      </PageBody>
    </div>
  );
}

function SponsorRow({
  sponsor,
  first,
  last,
  dragging,
  dropTarget,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  sponsor: Sponsor;
  first: boolean;
  last: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onMove: (by: -1 | 1) => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const store = useStore();
  const upload = useImageUpload(SPONSOR_LOGO_IMAGE, (logo) => store.sponsors.update(sponsor.id, { logo }));
  // Only the handle starts a drag, so the name field still selects text normally.
  const [armed, setArmed] = useState(false);
  const setTier = (tier: SponsorTier) => tier !== sponsor.tier && void store.sponsors.update(sponsor.id, { tier });

  return (
    <div
      draggable={armed}
      onDragStart={(e: DragEvent) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onDragEnd={() => {
        setArmed(false);
        onDragEnd();
      }}
      className={cn(
        sponsorRow,
        "rounded-md border border-transparent px-1.5 py-1.5",
        dragging && "opacity-40",
        dropTarget && "border-accent bg-control",
      )}
    >
      <div
        className="flex h-9 cursor-grab items-center justify-center text-faint hover:text-soft"
        title="Drag to reorder"
        aria-hidden="true"
        onPointerDown={() => setArmed(true)}
        onPointerUp={() => setArmed(false)}
      >
        ⠿
      </div>
      <label
        className={cn(
          "flex size-[52px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-line-strong bg-well text-faint",
          "hover:border-accent focus-within:border-accent",
        )}
        title={sponsor.logo ? "Replace logo (PNG)" : "Upload logo (PNG)"}
      >
        <Thumb url={sponsor.logo} className="size-11 object-contain" />
        <input type="file" accept={LOGO_ACCEPT} onChange={upload.onChange} className={hiddenFileInput} />
      </label>
      <CommitInput
        type="text"
        aria-label="Sponsor name (this list only)"
        placeholder="Name (not shown on air)"
        value={sponsor.name}
        onCommit={(v) => void store.sponsors.update(sponsor.id, { name: v.trim() })}
      />
      <div className="flex gap-1 max-[640px]:col-start-3" role="group" aria-label="Tier">
        {(["main", "partner"] as const).map((tier) => (
          <Button
            key={tier}
            variant="small"
            aria-pressed={sponsor.tier === tier}
            className={cn("h-9 px-3", sponsor.tier === tier && "border-accent bg-accent text-white")}
            onClick={() => setTier(tier)}
          >
            {tier === "main" ? "Main" : "Partner"}
          </Button>
        ))}
      </div>
      <div className="flex gap-1 max-[640px]:col-start-3">
        <Button variant="ghost" className={ICON} aria-label="Move up" disabled={first} onClick={() => onMove(-1)}>
          ▲
        </Button>
        <Button variant="ghost" className={ICON} aria-label="Move down" disabled={last} onClick={() => onMove(1)}>
          ▼
        </Button>
        <Button
          variant="ghost"
          className={cn(ICON, "hover:border-danger hover:bg-transparent hover:text-danger")}
          aria-label="Delete sponsor"
          onClick={() => confirm(`Delete ${sponsor.name || "this sponsor"}?`) && void store.sponsors.remove(sponsor.id)}
        >
          &times;
        </Button>
      </div>
      {upload.status && (
        <div className="col-span-full">
          <ErrorText>{upload.status}</ErrorText>
        </div>
      )}
    </div>
  );
}
