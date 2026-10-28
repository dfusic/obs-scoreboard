import { useLiveData, useStore } from "@shared/react/store";
import { nextSponsorOrder } from "@shared/sponsors";
import type { Sponsor, SponsorTier } from "@shared/types";
import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { nameFromFileName, processImage, SPONSOR_LOGO_IMAGE } from "../images";
import {
  Badge,
  Button,
  cn,
  CommitInput,
  ErrorText,
  FileButton,
  hiddenFileInput,
  Hint,
  ICON,
  PageBody,
  PageHeader,
  Panel,
  PanelBody,
  PanelBoundary,
  PanelTitle,
  PlusIcon,
  Popover,
  readPref,
  SearchInput,
  Segmented,
  Spacer,
  Thumb,
  useImageUpload,
  writePref,
} from "../ui";
import { idsByTier, placeSponsor, stepSponsor } from "./sponsorOrder";

/** Logos are PNGs with transparency; other formats are accepted and converted. */
const LOGO_ACCEPT = "image/png,image/*";

type View = "grid" | "list";
const VIEW_KEY = "scoreboard.sponsors.view";
const VIEWS = ["grid", "list"] as const;

/** The light box logos sit on (most sponsor logos are made for white paper). */
const LOGO_BOX = "flex items-center justify-center overflow-hidden rounded-sm bg-logo-bg";

const SECTIONS: { tier: SponsorTier; title: string; note: string; grid: string }[] = [
  {
    tier: "main",
    title: "Main sponsors",
    note: "shown first, larger",
    grid: "grid-cols-4 max-[1100px]:grid-cols-3 max-[720px]:grid-cols-2",
  },
  {
    tier: "partner",
    title: "Partners",
    note: "drag to reorder, drop on Main to promote",
    grid: "grid-cols-6 max-[1100px]:grid-cols-4 max-[720px]:grid-cols-3 max-[420px]:grid-cols-2",
  },
];

/** Where a dragged sponsor would land: before `beforeId` in `tier` (null = at the end). */
interface DropTarget {
  tier: SponsorTier;
  beforeId: string | null;
}

/**
 * Sponsors: the account's own sponsor list (never a team's), shown in the Sponsors scene
 * as logos only, main sponsors first. Each sponsor comes from a logo file (one or many at
 * once), named after it for this list. Tiles can be dragged within and between tiers,
 * hidden from air, or edited in bulk.
 */
export function SponsorsPage({ hidden }: { hidden: boolean }) {
  const store = useStore();
  const { sponsors, match } = useLiveData();
  const onAir = match.program.scene === "sponsors";
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(true);
  const [view, setViewState] = useState<View>(() => readPref(VIEW_KEY, VIEWS, "grid"));
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<DropTarget | null>(null);

  const setView = (v: View) => {
    setViewState(v);
    writePref(VIEW_KEY, v);
  };

  const byTier = idsByTier(sponsors);
  const q = query.trim().toLowerCase();
  const searching = q !== "";
  const visible = sponsors.filter((s) => (showHidden || !s.hidden) && (!q || s.name.toLowerCase().includes(q)));
  // Bulk actions act only on what the operator can see (search and Show hidden can hide a selection).
  const selectedIds = visible.filter((s) => selected.has(s.id)).map((s) => s.id);
  const mainCount = byTier.main.length;
  const hiddenCount = sponsors.filter((s) => s.hidden).length;

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
        : `Added ${files.length} ${files.length === 1 ? "sponsor" : "sponsors"} as partners.`,
    );
    input.value = "";
  };

  /** Moves a sponsor to `tier` (before `beforeId`, or last): tier change + new order. */
  const place = (s: Sponsor, tier: SponsorTier, beforeId: string | null) => {
    const ordered = placeSponsor(byTier, s.id, tier, beforeId);
    // One batch with the tier change; `sponsors` lets the store write only the orders that change.
    if (tier !== s.tier) void store.sponsors.place(s.id, tier, ordered, sponsors);
    else void store.sponsors.reorder(ordered, sponsors);
  };
  const step = (id: string, by: -1 | 1) => {
    const next = stepSponsor(byTier, id, by);
    if (next) void store.sponsors.reorder(next, sponsors);
  };

  const toggle = (id: string) =>
    setSelected((sel) => {
      const next = new Set(sel);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const clearSelection = () => setSelected(new Set());
  // A new search or Show hidden setting starts a new selection.
  const changeQuery = (v: string) => {
    setQuery(v);
    clearSelection();
  };
  const changeShowHidden = (v: boolean) => {
    setShowHidden(v);
    clearSelection();
  };
  const bulk = (fields: Partial<{ tier: SponsorTier; hidden: boolean }>) => void store.sponsors.updateMany(selectedIds, fields);
  const bulkDelete = () => {
    const n = selectedIds.length;
    if (!confirm(`Delete ${n} ${n === 1 ? "sponsor" : "sponsors"}?`)) return;
    void store.sponsors.removeMany(selectedIds);
    clearSelection();
  };

  const endDrag = () => {
    setDragId(null);
    setOver(null);
  };
  const drop = (target: DropTarget) => {
    const s = sponsors.find((x) => x.id === dragId);
    if (s && target.beforeId !== s.id) place(s, target.tier, target.beforeId);
    endDrag();
  };
  const drag = searching
    ? null
    : {
        dragId,
        over,
        start: (id: string) => setDragId(id),
        hover: (target: DropTarget) =>
          setOver((o) => (o?.tier === target.tier && o.beforeId === target.beforeId ? o : target)),
        drop,
        end: endDrag,
      };

  return (
    <div hidden={hidden}>
      <PageHeader
        title="Sponsors"
        sub={`${sponsors.length} ${sponsors.length === 1 ? "sponsor" : "sponsors"} · ${mainCount} main · ${hiddenCount} hidden. Only logos go on air, in this order.`}
      >
        <FileButton variant="primary" accept={LOGO_ACCEPT} multiple onChange={addFromLogos}>
          <PlusIcon /> Add sponsor logos
        </FileButton>
      </PageHeader>
      <PageBody>
        {onAir && (
          <div role="status" className="flex items-center gap-2 rounded-md border border-danger/60 bg-danger-bg px-4 py-2.5 text-[13px] text-danger-text">
            <span className="size-2 shrink-0 rounded-full bg-danger" aria-hidden="true" />
            <strong className="font-semibold">Sponsors scene is on air:</strong> changes show at once.
          </div>
        )}
        {status && <Hint>{status}</Hint>}
        {sponsors.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="font-condensed text-base font-bold tracking-[0.06em] text-dim uppercase">No sponsors yet</div>
            <Hint className="mt-1.5">Pick one or more logo files with "Add sponsor logos": each file becomes a sponsor.</Hint>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput label="Search sponsors" value={query} onChange={changeQuery} className="w-[240px] max-[480px]:w-full" />
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" checked={showHidden} onChange={(e) => changeShowHidden(e.target.checked)} />
                Show hidden
              </label>
              <Spacer />
              <Segmented
                label="View"
                value={view}
                onChange={setView}
                options={[
                  { id: "grid", label: "Grid" },
                  { id: "list", label: "List" },
                ]}
              />
            </div>

            {selectedIds.length > 0 && (
              <div
                role="toolbar"
                aria-label="Selected sponsors"
                className="sticky top-2 z-20 flex flex-wrap items-center gap-1.5 rounded-md border border-accent/60 bg-panel px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
              >
                <span className="mr-2 text-sm font-semibold text-fg">{selectedIds.length} selected</span>
                <Button variant="small" onClick={() => bulk({ tier: "main" })}>Move to Main</Button>
                <Button variant="small" onClick={() => bulk({ tier: "partner" })}>Move to Partners</Button>
                <Button variant="small" onClick={() => bulk({ hidden: true })}>Hide from air</Button>
                <Button variant="small" onClick={() => bulk({ hidden: false })}>Show on air</Button>
                <Button variant="small" className="text-danger hover:bg-danger hover:text-white" onClick={bulkDelete}>
                  Delete
                </Button>
                <Spacer />
                <Button variant="ghost" className="h-7 px-3 text-[11px]" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            )}

            {SECTIONS.map((sec) => {
              const items = visible.filter((s) => (sec.tier === "main") === (s.tier === "main"));
              const total = byTier[sec.tier].length;
              return (
                <PanelBoundary key={sec.tier} name={sec.title}>
                  <Section
                    title={sec.title}
                    count={total}
                    note={sec.note}
                    dropActive={!!drag?.dragId && drag.over?.tier === sec.tier && drag.over.beforeId === null}
                    onDragOver={drag ? () => drag.hover({ tier: sec.tier, beforeId: null }) : undefined}
                    onDrop={drag ? () => drag.drop({ tier: sec.tier, beforeId: null }) : undefined}
                  >
                    {items.length === 0 ? (
                      <Hint className="py-4 text-center">
                        {searching
                          ? "No match in this section."
                          : total > 0
                            ? "All hidden. Tick Show hidden to see them."
                            : sec.tier === "main"
                              ? "No main sponsors. Drag a partner here, or use its ⋯ menu."
                              : "No partners."}
                      </Hint>
                    ) : (
                      <div className={view === "grid" ? cn("grid gap-3", sec.grid) : "flex flex-col gap-1"}>
                        {items.map((s) => {
                          const list = byTier[sec.tier];
                          return (
                            <SponsorItem
                              key={s.id}
                              sponsor={s}
                              view={view}
                              large={sec.tier === "main"}
                              selected={selected.has(s.id)}
                              onToggle={() => toggle(s.id)}
                              first={list[0] === s.id}
                              last={list[list.length - 1] === s.id}
                              onStep={(by) => step(s.id, by)}
                              onTier={(tier) => place(s, tier, null)}
                              dragging={drag?.dragId === s.id}
                              dropBefore={!!drag?.dragId && drag.over?.beforeId === s.id && drag.dragId !== s.id}
                              dnd={
                                drag && {
                                  start: () => drag.start(s.id),
                                  over: () => drag.hover({ tier: sec.tier, beforeId: s.id }),
                                  drop: () => drag.drop({ tier: sec.tier, beforeId: s.id }),
                                  end: drag.end,
                                }
                              }
                            />
                          );
                        })}
                      </div>
                    )}
                  </Section>
                </PanelBoundary>
              );
            })}
          </>
        )}
        <Hint>
          {searching
            ? "Clear the search to drag. Moving works from each logo's ⋯ menu."
            : "Drag logos to reorder, or onto the other section to change tier. Hidden sponsors stay listed but aren't shown on air. Transparent PNGs read best."}
        </Hint>
      </PageBody>
    </div>
  );
}

function Section({
  title,
  count,
  note,
  dropActive,
  onDragOver,
  onDrop,
  children,
}: {
  title: string;
  count: number;
  note: string;
  dropActive: boolean;
  onDragOver?: () => void;
  onDrop?: () => void;
  children: ReactNode;
}) {
  return (
    <Panel className={cn(dropActive && "border-accent")}>
      <PanelTitle>
        <span>
          {title} · {count}
        </span>
        <span className="font-sans text-[11px] font-normal tracking-normal text-dim normal-case">— {note}</span>
      </PanelTitle>
      <div
        onDragOver={
          onDragOver &&
          ((e: DragEvent) => {
            e.preventDefault();
            onDragOver();
          })
        }
        onDrop={
          onDrop &&
          ((e: DragEvent) => {
            e.preventDefault();
            onDrop();
          })
        }
      >
        <PanelBody>{children}</PanelBody>
      </div>
    </Panel>
  );
}

interface Dnd {
  start: () => void;
  over: () => void;
  drop: () => void;
  end: () => void;
}

function SponsorItem({
  sponsor,
  view,
  large,
  selected,
  onToggle,
  first,
  last,
  onStep,
  onTier,
  dragging,
  dropBefore,
  dnd,
}: {
  sponsor: Sponsor;
  view: View;
  large: boolean;
  selected: boolean;
  onToggle: () => void;
  first: boolean;
  last: boolean;
  onStep: (by: -1 | 1) => void;
  onTier: (tier: SponsorTier) => void;
  dragging: boolean;
  dropBefore: boolean;
  dnd: Dnd | null;
}) {
  const label = sponsor.name || "Unnamed sponsor";
  const dragProps = dnd && {
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", sponsor.id);
      dnd.start();
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dnd.over();
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dnd.drop();
    },
    onDragEnd: dnd.end,
  };
  const checkbox = (
    <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select ${label}`} />
  );
  const menu = (
    <SponsorMenu sponsor={sponsor} first={first} last={last} onStep={onStep} onTier={onTier} />
  );
  const hiddenBadge = sponsor.hidden && <Badge tone="neutral">Hidden</Badge>;

  if (view === "list") {
    return (
      <div
        {...dragProps}
        className={cn(
          "grid grid-cols-[18px_16px_64px_minmax(0,1fr)_auto_auto] items-center gap-2.5 rounded-sm border border-transparent px-2 py-1.5",
          dnd && "cursor-grab",
          selected && "bg-accent/10",
          dragging && "opacity-40",
          dropBefore && "border-t-accent",
        )}
      >
        {checkbox}
        <span className={cn("text-faint", !dnd && "invisible")} aria-hidden="true">
          ⠿
        </span>
        <div className={cn(LOGO_BOX, "h-9 w-16", sponsor.hidden && "opacity-40")}>
          <Thumb url={sponsor.logo} className="size-full object-contain p-1" iconSize={16} />
        </div>
        <span className={cn("truncate text-sm", sponsor.hidden ? "text-dim" : "text-fg")}>{label}</span>
        <div className="flex gap-1">{hiddenBadge}</div>
        {menu}
      </div>
    );
  }

  return (
    <div
      {...dragProps}
      className={cn(
        "relative flex min-w-0 flex-col gap-1.5 rounded-md border border-line bg-well p-2",
        dnd && "cursor-grab",
        selected && "border-accent bg-accent/10",
        dragging && "opacity-40",
        dropBefore && "shadow-[-4px_0_0_var(--color-accent)]",
      )}
    >
      <div className={cn(LOGO_BOX, large ? "aspect-[16/9]" : "aspect-[3/2]", sponsor.hidden && "opacity-40")}>
        <Thumb url={sponsor.logo} className={cn("size-full object-contain", large ? "p-3" : "p-2")} />
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        {checkbox}
        <span className={cn("min-w-0 flex-1 truncate text-xs", sponsor.hidden ? "text-dim" : "text-soft")} title={label}>
          {label}
        </span>
        {menu}
      </div>
      {sponsor.hidden && <div className="absolute top-3 left-3">{hiddenBadge}</div>}
    </div>
  );
}

const menuItem =
  "flex h-8 w-full items-center justify-start rounded-sm bg-transparent px-2.5 text-left text-xs text-soft hover:bg-control hover:opacity-100 disabled:hover:bg-transparent";

/** The ⋯ menu: every tile action, also the keyboard way to reorder and change tier. */
function SponsorMenu({
  sponsor,
  first,
  last,
  onStep,
  onTier,
}: {
  sponsor: Sponsor;
  first: boolean;
  last: boolean;
  onStep: (by: -1 | 1) => void;
  onTier: (tier: SponsorTier) => void;
}) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const upload = useImageUpload(SPONSOR_LOGO_IMAGE, (logo) => store.sponsors.update(sponsor.id, { logo }));
  const run = (action: () => void) => () => {
    action();
    setOpen(false);
  };
  const label = sponsor.name || "this sponsor";

  return (
    <div className="relative" onDragStart={(e) => e.stopPropagation()}>
      <Button
        ref={triggerRef}
        variant="ghost"
        className={cn(ICON, "h-7 w-7 border-transparent text-base")}
        aria-label={`Actions for ${label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
      </Button>
      <Popover open={open} onClose={() => setOpen(false)} ignore={triggerRef} label={`Actions for ${label}`}
        className="top-full right-0 mt-1 w-[220px] gap-0.5 p-1.5">
        <button type="button" className={menuItem} disabled={first} onClick={run(() => onStep(-1))}>
          Move up
        </button>
        <button type="button" className={menuItem} disabled={last} onClick={run(() => onStep(1))}>
          Move down
        </button>
        <button type="button" className={menuItem} onClick={run(() => onTier(sponsor.tier === "main" ? "partner" : "main"))}>
          {sponsor.tier === "main" ? "Make partner" : "Make main"}
        </button>
        <button type="button" className={menuItem}
          onClick={run(() => void store.sponsors.update(sponsor.id, { hidden: !sponsor.hidden }))}>
          {sponsor.hidden ? "Show on air" : "Hide from air"}
        </button>
        <label className={cn(menuItem, "relative cursor-pointer font-condensed font-bold tracking-[0.08em] uppercase focus-within:outline-2 focus-within:outline-accent")}>
          Replace logo
          <input type="file" accept={LOGO_ACCEPT} onChange={upload.onChange} className={hiddenFileInput} />
        </label>
        {upload.status && <ErrorText>{upload.status}</ErrorText>}
        <div className="my-1 border-t border-line px-1 pt-2">
          <label className="mb-1 block text-[11px] text-dim" htmlFor={`sponsor-name-${sponsor.id}`}>
            Rename (this list only)
          </label>
          <CommitInput
            key={sponsor.id}
            id={`sponsor-name-${sponsor.id}`}
            type="text"
            placeholder="Name (not shown on air)"
            value={sponsor.name}
            onCommit={(v) => void store.sponsors.update(sponsor.id, { name: v.trim() })}
            className="h-8"
          />
        </div>
        <button
          type="button"
          className={cn(menuItem, "text-danger hover:bg-danger hover:text-white")}
          onClick={() => {
            if (!confirm(`Delete ${label}?`)) return;
            setOpen(false);
            void store.sponsors.remove(sponsor.id);
          }}
        >
          Delete
        </button>
      </Popover>
    </div>
  );
}
