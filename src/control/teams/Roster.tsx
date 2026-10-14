import { useSubscription } from "@shared/react/hooks";
import { useStore } from "@shared/react/store";
import type { Player } from "@shared/types";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { nameFromFileName, PHOTO_IMAGE, processImage } from "../images";
import {
  Button,
  cn,
  CommitInput,
  ErrorText,
  hiddenFileInput,
  Hint,
  ICON,
  Thumb,
  UploadButton,
  useImageUpload,
} from "../ui";

/** Photos are PNG cut-outs; other formats are accepted and converted. */
const PHOTO_ACCEPT = "image/png,image/*";

const photoSlot = cn(
  "flex size-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-line-strong bg-well text-faint",
  "hover:border-accent focus-within:border-accent",
);
const playerRow = "grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2";

/** A team's squad: add players (one by one or from photos), rename, replace photos, delete. */
export function Roster({ teamId }: { teamId: string }) {
  const store = useStore();
  const players = useSubscription<Player[]>((cb) => store.players.subscribe([teamId], cb), [], [store, teamId]);
  const [status, setStatus] = useState<string | null>(null);

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

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="font-condensed text-xs font-bold tracking-[0.1em] text-soft uppercase">
        Squad · {players.length} {players.length === 1 ? "player" : "players"}
      </div>
      <AddPlayerForm teamId={teamId} onStatus={setStatus} />
      <UploadButton accept={PHOTO_ACCEPT} multiple onChange={addFromPhotos}>
        Add players from photos
      </UploadButton>
      {status && <Hint>{status}</Hint>}
      <div className="flex flex-col gap-1.5">
        {players.map((p) => (
          <PlayerRow key={p.id} player={p} />
        ))}
      </div>
      <Hint>
        Photos: PNG cut-outs with a transparent background work best. "Add players from photos" creates one player per
        file, named after the file (e.g. <code>ivan_horvat.png</code> becomes Ivan Horvat). Click a photo to replace it;
        names save when you leave the field.
      </Hint>
    </div>
  );
}

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
    <form onSubmit={onSubmit} className={cn(playerRow, "mb-1.5 border-b border-line pb-3")}>
      <label className={photoSlot} title="Photo (PNG)">
        <Thumb url={previewUrl} className="size-full object-cover" />
        <input
          name="photo"
          type="file"
          accept={PHOTO_ACCEPT}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={hiddenFileInput}
        />
      </label>
      <input name="name" type="text" placeholder="Full name" aria-label="Full name" required />
      <Button type="submit" variant="small" className="h-9">
        Add player
      </Button>
    </form>
  );
}

function PlayerRow({ player }: { player: Player }) {
  const store = useStore();
  const upload = useImageUpload(PHOTO_IMAGE, (photo) => store.players.update(player.id, { photo }));
  return (
    <div className={playerRow}>
      <label className={photoSlot} title="Replace photo (PNG)">
        <Thumb url={player.photo} className="size-full object-cover" />
        <input type="file" accept={PHOTO_ACCEPT} onChange={upload.onChange} className={hiddenFileInput} />
      </label>
      <CommitInput
        type="text"
        aria-label="Full name"
        value={player.name}
        onCommit={(v) => v.trim() && void store.players.update(player.id, { name: v.trim() })}
      />
      <Button
        variant="ghost"
        className={ICON}
        aria-label="Delete player"
        onClick={() => confirm(`Delete ${player.name}?`) && void store.players.remove(player.id)}
      >
        &times;
      </Button>
      {upload.status && (
        <div className="col-span-full">
          <ErrorText>{upload.status}</ErrorText>
        </div>
      )}
    </div>
  );
}
