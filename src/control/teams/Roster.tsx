import { useSubscription } from "@shared/react/hooks";
import { useStore } from "@shared/react/store";
import { staleTeamStats } from "@shared/squad";
import type { Player, TeamProfile } from "@shared/types";
import type { SyncStatus } from "@shared/store/types";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { nameFromFileName, PHOTO_IMAGE, processImage } from "../images";
import {
  Button,
  cn,
  CommitInput,
  ErrorText,
  hiddenFileInput,
  Hint,
  ICON,
  SearchInput,
  Thumb,
  UploadButton,
  useImageUpload,
} from "../ui";

/** Photos are PNG cut-outs; other formats are accepted and converted. */
const PHOTO_ACCEPT = "image/png,image/*";

/** Until the first status arrives, assume not in step (no stats repair yet). */
const UNKNOWN_SYNC: SyncStatus = { connected: false, pendingWrites: true };

/** Waits this long before repairing the counts: the players and team listeners can be a snapshot apart. */
const STATS_REPAIR_DELAY_MS = 1000;

/**
 * A team's squad (the drawer's Squad tab): add players (one by one or from photos), search,
 * rename, replace photos, delete. `players` comes from the drawer's subscription (null until
 * its first snapshot).
 */
export function Roster({ team, players }: { team: TeamProfile; players: Player[] | null }) {
  const store = useStore();
  const teamId = team.id;
  const sync = useSubscription<SyncStatus>((cb) => store.sync.subscribe(cb), UNKNOWN_SYNC, [store]);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Self-repair of the team's counts (null on older teams, or drifted), from the whole loaded
  // squad. Only while in step with the server: offline the cache may hold part of the squad,
  // and with pending writes another client's counts may still be on their way.
  const stale = players && sync.connected && !sync.pendingWrites ? staleTeamStats(team, players) : null;
  // Debounced, so counts that are only a snapshot behind aren't rewritten.
  useEffect(() => {
    if (!stale) return;
    const timer = setTimeout(() => void store.teams.setStats(teamId, stale), STATS_REPAIR_DELAY_MS);
    return () => clearTimeout(timer);
  }, [store, teamId, stale?.playerCount, stale?.missingPhotos]);

  const addFromPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = [...(input.files ?? [])];
    if (files.length === 0) return;
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      setStatus(`Adding ${i + 1} of ${files.length}...`);
      try {
        store.players.create({ teamId, name: nameFromFileName(file.name), photo: await processImage(file, PHOTO_IMAGE) });
      } catch {
        failed.push(file.name);
      }
    }
    setStatus(
      failed.length
        ? `Added ${files.length - failed.length}. Could not read: ${failed.join(", ")}`
        : `Added ${files.length} players. Check the names below.`,
    );
    input.value = "";
  };

  const q = query.trim().toLowerCase();
  const shown = (players ?? []).filter((p) => !q || p.name.toLowerCase().includes(q));

  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      <UploadButton accept={PHOTO_ACCEPT} multiple onChange={addFromPhotos}>
        Add players from photos
      </UploadButton>
      <AddPlayerForm teamId={teamId} onStatus={setStatus} />
      {status && <Hint>{status}</Hint>}
      <Hint>
        One player per photo, named after the file (<code>ivan_horvat.png</code> becomes Ivan Horvat). PNG cut-outs with
        a transparent background work best. Click a photo to replace it.
      </Hint>

      {players === null ? (
        <Hint>Loading squad…</Hint>
      ) : players.length === 0 ? (
        <div className="py-8 text-center font-condensed text-sm font-bold tracking-[0.06em] text-dim uppercase">
          No players yet
        </div>
      ) : (
        <>
          <SearchInput label="Search squad" value={query} onChange={setQuery} />
          {shown.length === 0 && <Hint>No player matches “{query.trim()}”.</Hint>}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2.5">
            {shown.map((p) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const Silhouette = () => (
  <svg viewBox="0 0 24 24" className="size-3/5" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="8" r="4.2" />
    <path d="M3.5 22c0-4.7 3.8-8.2 8.5-8.2s8.5 3.5 8.5 8.2z" />
  </svg>
);

function AddPlayerForm({ teamId, onStatus }: { teamId: string; onStatus: (status: string | null) => void }) {
  const store = useStore();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Preview the chosen photo in the add form.
  useEffect(() => {
    const url = file ? URL.createObjectURL(file) : null;
    setPreviewUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nameInput = form.elements.namedItem("name") as HTMLInputElement;
    const name = nameInput.value.trim();
    if (!name) return;
    try {
      const photo = file ? await processImage(file, PHOTO_IMAGE) : null;
      store.players.create({ teamId, name, photo });
      form.reset();
      setFile(null);
      nameInput.focus();
      onStatus(null);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : "Could not add player");
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2">
      <label
        className={cn(
          "flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-line-strong bg-well text-faint",
          "hover:border-accent focus-within:border-accent",
        )}
        title="Photo (PNG)"
      >
        {previewUrl ? <Thumb url={previewUrl} className="size-full object-cover" /> : <Silhouette />}
        <input
          name="photo"
          type="file"
          accept={PHOTO_ACCEPT}
          aria-label="Photo"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={hiddenFileInput}
        />
      </label>
      <input name="name" type="text" placeholder="Full name" aria-label="New player's full name" required />
      <Button type="submit" variant="small" className="h-9">
        Add player
      </Button>
    </form>
  );
}

function PlayerCard({ player }: { player: Player }) {
  const store = useStore();
  const upload = useImageUpload(PHOTO_IMAGE, (photo) => store.players.update(player, { photo }));
  // A second click while the delete is on its way does nothing (offline it settles only on reconnect).
  const deleting = useRef(false);
  const remove = () => {
    if (deleting.current || !confirm(`Delete ${player.name}?`)) return;
    deleting.current = true;
    void store.players.remove(player).finally(() => {
      deleting.current = false;
    });
  };
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-md border border-line bg-well">
      <label
        className="relative flex aspect-[4/5] cursor-pointer items-end justify-center overflow-hidden bg-control/40 text-faint hover:bg-control focus-within:outline-2 focus-within:outline-accent"
        title={player.photo ? "Replace photo (PNG)" : "Add photo (PNG)"}
      >
        {player.photo ? (
          <Thumb url={player.photo} className="size-full object-contain object-bottom" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Silhouette />
          </div>
        )}
        {!player.photo && (
          <span className="absolute top-1.5 left-1.5 font-condensed text-[10px] font-bold tracking-[0.08em] text-warning uppercase">
            No photo
          </span>
        )}
        <input type="file" accept={PHOTO_ACCEPT} aria-label={`Photo of ${player.name}`} onChange={upload.onChange}
          className={hiddenFileInput} />
      </label>
      <Button
        variant="ghost"
        className={cn(ICON, "absolute top-1 right-1 size-7 border-transparent bg-panel/80 text-base hover:border-danger hover:bg-panel hover:text-danger")}
        aria-label={`Delete ${player.name}`}
        onClick={remove}
      >
        &times;
      </Button>
      <CommitInput
        type="text"
        aria-label="Full name"
        value={player.name}
        onCommit={(v) => {
          if (!v.trim()) return false; // a player needs a name: the field goes back
          void store.players.update(player, { name: v.trim() });
        }}
        className="h-8 rounded-none border-0 border-t border-line bg-transparent px-2 text-[13px]"
      />
      {upload.status && (
        <div className="px-2 pb-1.5">
          <ErrorText>{upload.status}</ErrorText>
        </div>
      )}
    </div>
  );
}
