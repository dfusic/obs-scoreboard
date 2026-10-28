import { useLiveData, useStore } from "@shared/react/store";
import { compareRecentlyEdited } from "@shared/squad";
import type { Player, Side, TeamEditableFields, TeamProfile } from "@shared/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { LOGO_IMAGE } from "../images";
import { useTeams } from "../teamsContext";
import {
  Badge,
  Button,
  Chip,
  cn,
  CommitInput,
  ErrorText,
  Field,
  Hint,
  ICON,
  PageBody,
  PageHeader,
  Pagination,
  Panel,
  PanelBoundary,
  PlusIcon,
  SearchInput,
  Spacer,
  Thumb,
  UploadButton,
  useImageUpload,
} from "../ui";
import { Roster } from "./Roster";

const PAGE_SIZE = 25;

type Filter = "all" | "inMatch" | "noLogo" | "noPhotos";
type Sort = "recent" | "name";
type Tab = "details" | "squad";

const FILTERS: { id: Filter; label: string; test: (t: TeamProfile, inMatch: (id: string) => boolean) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "inMatch", label: "In match", test: (t, inMatch) => inMatch(t.id) },
  { id: "noLogo", label: "No logo", test: (t) => !t.logo },
  { id: "noPhotos", label: "No photos", test: hasNoPhotos },
];

/** Players without a photo, or no players at all. Unknown counts (older teams) don't match. */
function hasNoPhotos(t: TeamProfile): boolean {
  return (t.missingPhotos !== null && t.missingPhotos > 0) || t.playerCount === 0;
}

function matchesSearch(t: TeamProfile, q: string): boolean {
  if (!q) return true;
  return [t.name, t.city, t.shortName].some((s) => s.toLowerCase().includes(q));
}

/** Teams: a searchable table of clubs; a row opens its details and squad in a drawer. */
export function TeamsPage({ hidden }: { hidden: boolean }) {
  const store = useStore();
  const teams = useTeams();
  const { match } = useLiveData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("details");
  /** A team just added: its drawer opens with the name selected. */
  const [createdId, setCreatedId] = useState<string | null>(null);

  const sideOf = (id: string): Side | null =>
    match.teams.home === id ? "home" : match.teams.away === id ? "away" : null;
  const inMatch = (id: string) => sideOf(id) !== null;

  const q = query.trim().toLowerCase();
  const searched = useMemo(() => teams.filter((t) => matchesSearch(t, q)), [teams, q]);
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, searched.filter((t) => f.test(t, inMatch)).length])) as Record<
    Filter,
    number
  >;
  const activeFilter = FILTERS.find((f) => f.id === filter)!;
  const shown = searched
    .filter((t) => activeFilter.test(t, inMatch))
    .sort(sort === "recent" ? compareRecentlyEdited : (a, b) => a.name.localeCompare(b.name));
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const openTeam = openId ? teams.find((t) => t.id === openId) ?? null : null;

  const open = (id: string, nextTab: Tab = "details") => {
    setOpenId(id);
    setTab(nextTab);
  };
  const asideRef = useRef<HTMLElement>(null);
  /** Below 1280px the drawer overlays the table, as a modal dialog. */
  const overlay = useMediaQuery("(max-width: 1279px)");
  const close = () => {
    const closing = openId;
    setOpenId(null);
    setCreatedId(null);
    // Back to the row that opened it (the drawer covered it), unless focus has moved elsewhere.
    if (closing && overlay && (asideRef.current?.contains(document.activeElement) || document.activeElement === document.body))
      document.querySelector<HTMLElement>(`[data-team-open="${CSS.escape(closing)}"]`)?.focus();
  };
  const addTeam = () => {
    const id = store.teams.create();
    setCreatedId(id);
    open(id);
  };

  // Overlay mode: the drawer takes focus (its first field) when it opens or shows another team.
  const drawerReady = openTeam !== null;
  useEffect(() => {
    if (hidden || !overlay || !openId || !drawerReady) return;
    const aside = asideRef.current;
    if (!aside || aside.contains(document.activeElement)) return;
    aside.querySelector<HTMLElement>("input:not([type=file]), select, textarea, button")?.focus();
  }, [hidden, overlay, openId, drawerReady]);

  // Esc closes the drawer (only while this page is showing; all pages stay mounted).
  useEffect(() => {
    if (hidden || !openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hidden, openId]);

  return (
    <div hidden={hidden}>
      <PageHeader
        title="Teams"
        sub={`${teams.length} ${teams.length === 1 ? "team" : "teams"} · click a row to edit details and squad`}
      >
        <Button variant="primary" onClick={addTeam}>
          <PlusIcon /> Add team
        </Button>
      </PageHeader>
      <PageBody>
        <div className={cn("grid items-start gap-4", openId && "min-[1280px]:grid-cols-[minmax(0,1fr)_440px]")}>
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                label="Search teams"
                placeholder="Search name, city, code"
                value={query}
                onChange={(v) => {
                  setQuery(v);
                  setPage(0);
                }}
                className="w-[260px] max-[480px]:w-full"
              />
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter">
                {FILTERS.map((f) => (
                  <Chip
                    key={f.id}
                    active={filter === f.id}
                    count={counts[f.id]}
                    onClick={() => {
                      setFilter(f.id);
                      setPage(0);
                    }}
                  >
                    {f.label}
                  </Chip>
                ))}
              </div>
              <Spacer />
              <label className="flex items-center gap-2 text-xs text-dim">
                Sort
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-8 w-auto">
                  <option value="recent">Recently edited</option>
                  <option value="name">Name A–Z</option>
                </select>
              </label>
            </div>

            <PanelBoundary name="Teams">
              <Panel className="overflow-x-auto">
                {teams.length === 0 ? (
                  <Empty title="No teams yet" hint="Add the clubs you broadcast, then their players." />
                ) : shown.length === 0 ? (
                  <Empty title="No matching teams" hint="Try another search or filter." />
                ) : (
                  <TeamTable rows={rows} openId={openId} sideOf={sideOf} onOpen={open} />
                )}
              </Panel>
            </PanelBoundary>
            {shown.length > 0 && <Pagination page={current} pageSize={PAGE_SIZE} total={shown.length} onPage={setPage} />}
          </div>

          {openId && (
            <>
              {/* Narrow screens: the drawer overlays the table. */}
              <div className="fixed inset-0 z-30 bg-black/60 min-[1280px]:hidden" aria-hidden="true" onClick={close} />
              <aside
                ref={asideRef}
                aria-label="Team"
                role={overlay ? "dialog" : undefined}
                aria-modal={overlay ? true : undefined}
                className={cn(
                  "fixed inset-y-0 right-0 z-40 flex w-[min(460px,100vw)] flex-col overflow-y-auto border-l border-line-strong bg-panel",
                  "min-[1280px]:sticky min-[1280px]:inset-auto min-[1280px]:top-4 min-[1280px]:z-auto min-[1280px]:max-h-[calc(100vh-32px)]",
                  "min-[1280px]:w-auto min-[1280px]:rounded-md min-[1280px]:border",
                )}
              >
                <PanelBoundary name="Team">
                  {openTeam ? (
                    <TeamDrawer
                      key={openTeam.id}
                      team={openTeam}
                      side={sideOf(openTeam.id)}
                      tab={tab}
                      onTab={setTab}
                      justCreated={openTeam.id === createdId}
                      onClose={close}
                    />
                  ) : (
                    <div className="flex items-center p-4">
                      <Hint>Loading…</Hint>
                      <Spacer />
                      <CloseButton onClose={close} />
                    </div>
                  )}
                </PanelBoundary>
              </aside>
            </>
          )}
        </div>
      </PageBody>
    </div>
  );
}

/** Whether the media query matches, following changes (e.g. resizing the window). */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="px-5 py-16 text-center">
      <div className="font-condensed text-base font-bold tracking-[0.06em] text-dim uppercase">{title}</div>
      <Hint className="mt-1.5">{hint}</Hint>
    </div>
  );
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

/** The team's logo, or its initials in its colours. */
function TeamMark({ team, size = "size-9" }: { team: TeamProfile; size?: string }) {
  return team.logo ? (
    <div className={cn("flex shrink-0 items-center justify-center", size)}>
      <Thumb url={team.logo} className="size-full object-contain" />
    </div>
  ) : (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-line-strong font-condensed text-xs font-bold",
        size,
      )}
      style={{ background: team.primaryColor, color: team.secondaryColor }}
      aria-hidden="true"
    >
      {initials(team.name)}
    </div>
  );
}

const SIDE_LABEL: Record<Side, string> = { home: "Home", away: "Away" };
const th = "px-3 py-2.5 text-left font-condensed text-[11px] font-bold tracking-[0.12em] text-dim uppercase";
const td = "px-3 py-2";

function TeamTable({
  rows,
  openId,
  sideOf,
  onOpen,
}: {
  rows: TeamProfile[];
  openId: string | null;
  sideOf: (id: string) => Side | null;
  onOpen: (id: string) => void;
}) {
  return (
    <table className="w-full min-w-[640px] border-collapse text-sm">
      <thead className="border-b border-line">
        <tr>
          <th className={th}>Team</th>
          <th className={th}>Code</th>
          <th className={th}>City</th>
          <th className={th}>Colours</th>
          <th className={cn(th, "text-right")}>Players</th>
          <th className={th}>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t) => {
          const side = sideOf(t.id);
          const selected = t.id === openId;
          return (
            <tr
              key={t.id}
              onClick={() => onOpen(t.id)}
              className={cn(
                "cursor-pointer border-b border-line last:border-b-0 hover:bg-control/60",
                selected && "bg-accent/10 shadow-[inset_3px_0_0_var(--color-accent)] hover:bg-accent/15",
              )}
            >
              <td className={td}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <TeamMark team={t} />
                  {/* The button makes the row reachable by keyboard; the row click covers the mouse. */}
                  <button
                    type="button"
                    data-team-open={t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(t.id);
                    }}
                    className="truncate bg-transparent p-0 text-left font-sans text-sm font-semibold tracking-normal text-fg normal-case"
                  >
                    {t.name}
                  </button>
                </div>
              </td>
              <td className={cn(td, "font-condensed font-bold tracking-[0.06em] text-soft")}>{t.shortName || "—"}</td>
              <td className={cn(td, "text-muted")}>{t.city || "—"}</td>
              <td className={td}>
                <div className="flex gap-1">
                  <Swatch color={t.primaryColor} />
                  <Swatch color={t.secondaryColor} />
                </div>
              </td>
              <td className={cn(td, "text-right tabular-nums text-soft")}>{t.playerCount ?? "—"}</td>
              <td className={td}>
                <div className="flex flex-wrap gap-1">
                  {side && <Badge tone="accent">{SIDE_LABEL[side]}</Badge>}
                  {!t.logo && <Badge tone="warning">No logo</Badge>}
                  {hasNoPhotos(t) && <Badge tone="warning">No photos</Badge>}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const Swatch = ({ color }: { color: string }) => (
  <span className="size-4 rounded-full border border-line-strong" style={{ background: color }} title={color} />
);

const CloseButton = ({ onClose }: { onClose: () => void }) => (
  <Button variant="ghost" className={cn(ICON, "size-8 text-base")} aria-label="Close" onClick={onClose}>
    ✕
  </Button>
);

function TeamDrawer({
  team,
  side,
  tab,
  onTab,
  justCreated,
  onClose,
}: {
  team: TeamProfile;
  side: Side | null;
  tab: Tab;
  onTab: (tab: Tab) => void;
  justCreated: boolean;
  onClose: () => void;
}) {
  const store = useStore();
  // The squad, subscribed for the drawer's whole life: the Squad tab shows it, and Remove team
  // takes its ids from here, so it never needs a server read (works offline).
  /** null until the first snapshot, so an empty initial value isn't taken for an empty squad. */
  const [players, setPlayers] = useState<Player[] | null>(null);
  useEffect(() => {
    setPlayers(null);
    return store.players.subscribe([team.id], setPlayers);
  }, [store, team.id]);
  const tabs: { id: Tab; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "squad", label: `Squad · ${team.playerCount ?? "—"}` },
  ];
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
        <TeamMark team={team} size="size-11" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-condensed text-lg font-bold tracking-[0.04em] text-white uppercase">{team.name}</div>
          <div className="text-xs text-dim">{side ? `${SIDE_LABEL[side]} in current match` : "Not in current match"}</div>
        </div>
        <CloseButton onClose={onClose} />
      </div>
      <div role="tablist" aria-label="Team" className="flex gap-1 border-b border-line px-4 pt-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={cn(
              "-mb-px h-9 border-b-2 border-transparent bg-transparent px-3 text-xs text-muted hover:opacity-100 hover:text-soft",
              tab === t.id && "border-accent text-fg",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === "details" ? (
          <TeamDetails team={team} side={side} justCreated={justCreated} players={players} onRemoved={onClose} />
        ) : (
          <Roster team={team} players={players} />
        )}
      </div>
    </div>
  );
}

function TeamDetails({
  team,
  side,
  justCreated,
  players,
  onRemoved,
}: {
  team: TeamProfile;
  side: Side | null;
  justCreated: boolean;
  /** The squad from the drawer's subscription; null until its first snapshot. */
  players: Player[] | null;
  onRemoved: () => void;
}) {
  const store = useStore();
  const nameRef = useRef<HTMLInputElement>(null);
  const upload = useImageUpload(LOGO_IMAGE, (logo) => store.teams.update(team.id, { logo }));
  const save = (fields: Partial<TeamEditableFields>) => void store.teams.update(team.id, fields);
  const id = (field: string) => `team-${team.id}-${field}`;

  useEffect(() => {
    if (justCreated) nameRef.current?.select();
  }, [justCreated]);

  const remove = () => {
    const question = side
      ? `${team.name} is the ${side} team in the current match: it disappears from the scoreboard and every scene on air.\n\nDelete ${team.name} and all its players?`
      : `Delete ${team.name} and all its players?`;
    if (!confirm(question)) return;
    // Ids from the drawer's snapshot (only before the first one does the store read the squad itself).
    void store.teams.remove(team.id, players?.map((p) => p.id));
    onRemoved();
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5">
        <div className="col-span-2">
          <Field label="Team name" htmlFor={id("name")}>
            <CommitInput
              ref={nameRef}
              id={id("name")}
              type="text"
              value={team.name}
              onCommit={(v) => {
                if (!v.trim()) return false; // a team needs a name: the field goes back
                save({ name: v.trim() });
              }}
              className="h-10"
            />
          </Field>
        </div>
        <Field label="Short code" htmlFor={id("short")}>
          <CommitInput
            id={id("short")}
            type="text"
            maxLength={4}
            placeholder="e.g. GRA"
            value={team.shortName}
            onCommit={(v) => save({ shortName: v.trim().toUpperCase() })}
            className="h-10"
          />
        </Field>
        <Field label="City" htmlFor={id("city")}>
          <CommitInput
            id={id("city")}
            type="text"
            placeholder="e.g. Đurđevac"
            value={team.city}
            onCommit={(v) => save({ city: v.trim() })}
            className="h-10"
          />
        </Field>
        <Field label="Primary colour" htmlFor={id("primary")}>
          <CommitInput id={id("primary")} type="color" value={team.primaryColor} className="h-10"
            onCommit={(v) => save({ primaryColor: v })} />
        </Field>
        <Field label="Secondary colour" htmlFor={id("secondary")}>
          <CommitInput id={id("secondary")} type="color" value={team.secondaryColor} className="h-10"
            onCommit={(v) => save({ secondaryColor: v })} />
        </Field>
      </div>

      <Field label="Club logo (PNG)">
        <div className="flex items-center gap-2">
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line-strong bg-well text-faint">
            <Thumb url={team.logo} className="size-9 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <UploadButton onChange={upload.onChange}>{team.logo ? "Replace logo" : "Upload logo"}</UploadButton>
          </div>
          {team.logo && (
            <Button variant="ghost" className="h-11" onClick={() => save({ logo: null })}>
              Remove
            </Button>
          )}
        </div>
        {upload.status && <ErrorText>{upload.status}</ErrorText>}
      </Field>

      <Hint>Changes save as you leave each field and show on air at once if this team is playing.</Hint>

      <div className="mt-2 border-t border-line pt-3.5">
        <Button variant="danger" className="h-9 text-xs" onClick={remove}>
          Remove team
        </Button>
      </div>
    </div>
  );
}
