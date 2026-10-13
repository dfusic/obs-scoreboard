import { esc } from "@shared/html";
import { stepLineup } from "@shared/lineup";
import { matchPlayers, sidesWithPlayers, type LiveData } from "@shared/liveFeed";
import { setProgram } from "@shared/matchRepo";
import { activeScene, takeScene } from "@shared/program";
import type { ProgramState, Side } from "@shared/types";

let latest: LiveData | null = null;
let side: Side = "home";
/** Last take from this panel, used until the snapshot catches up (fast double presses). */
let lastTake: ProgramState | null = null;

/** The intro's current player, if the intro is what's on air for this side. */
function currentPlayerId(data: LiveData): string | null {
  let program = data.match.program;
  if (lastTake && lastTake.startedAtMs > program.startedAtMs) program = lastTake;
  const onAir = activeScene(program, Date.now()) === "presentation" && program.side === side;
  return onAir ? program.playerId : null;
}

function take(playerId: string): void {
  if (!latest) return;
  lastTake = takeScene("presentation", latest.scenes.presentation.durationMs, Date.now(), { side, playerId });
  void setProgram(lastTake);
}

/** Shows the previous (-1) / next (+1) lineup player; starts at the first when the intro isn't on air. */
function step(delta: number): void {
  if (!latest) return;
  const ids = matchPlayers(latest, side).map((p) => p.id);
  const playerId = stepLineup(ids, currentPlayerId(latest), delta);
  if (playerId) take(playerId);
}

function startFromFirst(): void {
  const first = latest && matchPlayers(latest, side)[0];
  if (first) take(first.id);
}

export function initPresentationPanel(root: HTMLElement): void {
  root.innerHTML = `
    <div class="panel-title">Player intro</div>
    <div class="panel-body">
      <div class="field" data-role="side-field" hidden>
        <label for="intro-side">Team</label>
        <select id="intro-side">
          <option value="home">Home</option>
          <option value="away">Away</option>
        </select>
      </div>
      <div class="intro-status">
        <span data-role="position" class="intro-position">—</span>
        <span data-role="name" class="intro-current">Not on air</span>
      </div>
      <div class="intro-controls">
        <button data-action="prev" type="button" class="scene-btn">◀ Prev</button>
        <button data-action="next" type="button" class="scene-btn intro-next">Next ▶</button>
      </div>
      <div class="row">
        <button data-action="first" type="button" class="btn-ghost">Start from first</button>
        <div class="spacer"></div>
        <button data-action="stop" type="button" class="btn-ghost">Back to scoreboard</button>
      </div>
      <p class="hint">Keys: ← / → (or a presenter clicker) while the Live page is open.</p>
    </div>
  `;

  root.querySelector<HTMLSelectElement>("#intro-side")!.addEventListener("change", (e) => {
    side = (e.target as HTMLSelectElement).value as Side;
    refresh(root);
  });

  root.addEventListener("click", (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>("[data-action]")?.dataset.action;
    if (action === "prev") step(-1);
    else if (action === "next") step(1);
    else if (action === "first") startFromFirst();
    else if (action === "stop") {
      lastTake = null;
      void setProgram(takeScene("scoreboard", null, Date.now()));
    }
  });

  // Keyboard / presenter clicker, timed by the operator to the commentary.
  document.addEventListener("keydown", (e) => {
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    const livePage = document.querySelector<HTMLElement>('[data-page="live"]');
    if (!livePage || livePage.hidden) return;
    if ((e.target as HTMLElement).closest("input, select, textarea, [contenteditable]")) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") step(1);
    else if (e.key === "ArrowLeft" || e.key === "PageUp") step(-1);
    else return;
    e.preventDefault();
  });

  setInterval(() => refresh(root), 250);
}

/** Shows which player is on air ("3 / 11 · Ivan Horvat") and disables buttons at the ends. */
function refresh(root: HTMLElement): void {
  if (!latest) return;
  const players = matchPlayers(latest, side);
  const currentId = currentPlayerId(latest);
  const index = currentId ? players.findIndex((p) => p.id === currentId) : -1;

  root.querySelector('[data-role="position"]')!.textContent = index >= 0 ? `${index + 1} / ${players.length}` : "—";
  root.querySelector('[data-role="name"]')!.innerHTML =
    index >= 0
      ? esc(players[index].name)
      : players.length
        ? `Not on air · ${players.length} players`
        : "No players. Pick the lineup first.";
  root.querySelector<HTMLButtonElement>('[data-action="prev"]')!.disabled = index <= 0;
  root.querySelector<HTMLButtonElement>('[data-action="next"]')!.disabled =
    players.length === 0 || index === players.length - 1;
  root.querySelector<HTMLElement>('[data-action="next"]')!.textContent = index >= 0 ? "Next ▶" : "Start ▶";
}

export function updatePresentationPanel(root: HTMLElement, data: LiveData): void {
  latest = data;
  const sides = sidesWithPlayers(data.match);
  if (!sides.includes(side)) side = "home";
  root.querySelector<HTMLElement>('[data-role="side-field"]')!.hidden = sides.length < 2;
  root.querySelector<HTMLSelectElement>("#intro-side")!.value = side;
  refresh(root);
}
