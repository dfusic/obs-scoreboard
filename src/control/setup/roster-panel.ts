import { esc } from "@shared/html";
import { createPlayer, deletePlayer, subscribeToPlayers, updatePlayer } from "@shared/playerRepo";
import type { Player, TeamProfile } from "@shared/types";
import { bindImageUpload, nameFromFileName, PHOTO_IMAGE, processImage, setFieldValue, setThumb, UPLOAD_ICON } from "../dom";

let teamId: string | null = null;
let unsubscribe: () => void = () => {};

/** Photos are PNG cut-outs; other formats are accepted and converted. */
const PHOTO_ACCEPT = "image/png,image/*";

export function initRosterPanel(root: HTMLElement): void {
  root.innerHTML = `
    <div class="panel-title" data-role="title">Squad</div>
    <div class="panel-body">
      <p data-role="no-team" class="hint">Pick or add a team to manage its players.</p>
      <div data-role="content" class="column" hidden>
        <form data-role="add-form" class="player-row add-row">
          <label class="player-photo" title="Photo (PNG)">
            <span data-role="add-thumb"></span>
            <input name="photo" type="file" accept="${PHOTO_ACCEPT}" />
          </label>
          <input name="name" type="text" placeholder="Full name" aria-label="Full name" required />
          <button type="submit" class="btn-small">Add player</button>
        </form>
        <label class="upload-btn">
          ${UPLOAD_ICON} Add players from photos
          <input data-role="bulk" type="file" accept="${PHOTO_ACCEPT}" multiple />
        </label>
        <span data-role="status" class="hint" hidden></span>
        <div data-role="rows" class="player-rows"></div>
        <p class="hint">
          Photos: PNG cut-outs with a transparent background work best. "Add players from photos" creates one
          player per file, named after the file (e.g. <code>ivan_horvat.png</code> becomes Ivan Horvat).
          Click a photo to replace it; names save when you leave the field.
        </p>
      </div>
    </div>
  `;

  const form = root.querySelector<HTMLFormElement>('[data-role="add-form"]')!;
  const addPhoto = form.querySelector<HTMLInputElement>('[name="photo"]')!;
  const addThumb = form.querySelector<HTMLElement>('[data-role="add-thumb"]')!;
  const status = root.querySelector<HTMLElement>('[data-role="status"]')!;
  setThumb(addThumb, null);

  // Preview the chosen photo in the add form.
  let previewUrl: string | null = null;
  const showAddPreview = (file: File | undefined) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = file ? URL.createObjectURL(file) : null;
    setThumb(addThumb, previewUrl);
  };
  addPhoto.addEventListener("change", () => showAddPreview(addPhoto.files?.[0]));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!teamId) return;
    const name = form.querySelector<HTMLInputElement>('[name="name"]')!.value.trim();
    const file = addPhoto.files?.[0];
    if (!name) return;
    try {
      const photo = file ? await processImage(file, PHOTO_IMAGE) : null;
      await createPlayer({ teamId, name, photo });
      form.reset();
      showAddPreview(undefined);
      form.querySelector<HTMLInputElement>('[name="name"]')!.focus();
      status.hidden = true;
    } catch (err) {
      status.hidden = false;
      status.textContent = err instanceof Error ? err.message : "Could not add player";
    }
  });

  const bulk = root.querySelector<HTMLInputElement>('[data-role="bulk"]')!;
  bulk.addEventListener("change", async () => {
    const files = [...(bulk.files ?? [])];
    const forTeam = teamId;
    if (!forTeam || files.length === 0) return;
    status.hidden = false;
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      status.textContent = `Adding ${i + 1} of ${files.length}...`;
      try {
        await createPlayer({ teamId: forTeam, name: nameFromFileName(file.name), photo: await processImage(file, PHOTO_IMAGE) });
      } catch {
        failed.push(file.name);
      }
    }
    status.textContent = failed.length
      ? `Added ${files.length - failed.length}. Could not read: ${failed.join(", ")}`
      : `Added ${files.length} players. Check the names below.`;
    bulk.value = "";
  });
}

function createRow(player: Player): HTMLElement {
  const row = document.createElement("div");
  row.className = "player-row";
  row.dataset.id = player.id;
  row.innerHTML = `
    <label class="player-photo" title="Replace photo (PNG)">
      <span data-role="thumb"></span>
      <input data-role="file" type="file" accept="${PHOTO_ACCEPT}" />
    </label>
    <input data-field="name" type="text" aria-label="Full name" />
    <button data-role="delete" type="button" class="btn-ghost btn-icon" aria-label="Delete player">&times;</button>
    <span data-role="status" class="error-text" hidden></span>
  `;

  const id = player.id;
  const nameInput = row.querySelector<HTMLInputElement>('[data-field="name"]')!;
  nameInput.addEventListener("change", () => {
    if (nameInput.value.trim()) void updatePlayer(id, { name: nameInput.value.trim() });
  });
  bindImageUpload(
    row.querySelector('[data-role="file"]')!,
    row.querySelector('[data-role="status"]')!,
    PHOTO_IMAGE,
    (photo) => updatePlayer(id, { photo }),
  );
  row.querySelector('[data-role="delete"]')!.addEventListener("click", () => {
    if (confirm(`Delete ${nameInput.value}?`)) void deletePlayer(id);
  });
  return row;
}

/** Keeps one row per player, in squad order, without disturbing a field being edited. */
function renderRows(root: HTMLElement, players: Player[]): void {
  const container = root.querySelector<HTMLElement>('[data-role="rows"]')!;
  const existing = new Map([...container.querySelectorAll<HTMLElement>(".player-row")].map((r) => [r.dataset.id!, r]));
  for (const player of players) {
    const row = existing.get(player.id) ?? createRow(player);
    existing.delete(player.id);
    container.appendChild(row);
    setFieldValue(row.querySelector('[data-field="name"]')!, player.name);
    setThumb(row.querySelector('[data-role="thumb"]')!, player.photo);
  }
  existing.forEach((row) => row.remove());
}

/** Switches the squad to the given team (subscribing to its players). */
export function showRosterFor(root: HTMLElement, team: TeamProfile | null): void {
  root.querySelector('[data-role="title"]')!.innerHTML = team ? `Squad · ${esc(team.name)}` : "Squad";
  (root.querySelector('[data-role="no-team"]') as HTMLElement).hidden = team !== null;
  (root.querySelector('[data-role="content"]') as HTMLElement).hidden = team === null;

  const nextId = team?.id ?? null;
  if (nextId === teamId) return;
  teamId = nextId;
  unsubscribe();
  root.querySelector('[data-role="rows"]')!.innerHTML = "";
  unsubscribe = subscribeToPlayers(teamId ? [teamId] : [], (players) => renderRows(root, players));
}
