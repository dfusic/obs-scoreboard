import { esc } from "@shared/html";
import { matchPlayers, sidesWithPlayers, type LiveData } from "@shared/liveFeed";
import { setProgram } from "@shared/matchRepo";
import { activeScene, takeScene } from "@shared/program";
import { SCENE_LABELS, SIDES, type SceneType, type Side } from "@shared/types";

let latest: LiveData | null = null;
let playersKey = "";

/** One-click scenes. Lineup is per side; goal is taken from the score panel. */
const QUICK_TAKES: { scene: SceneType; side?: Side; label: string }[] = [
  { scene: "scoreboard", label: SCENE_LABELS.scoreboard },
  { scene: "welcome", label: SCENE_LABELS.welcome },
  { scene: "lineup", side: "home", label: "Lineup" },
  { scene: "lineup", side: "away", label: "Lineup away" },
  { scene: "halftime", label: SCENE_LABELS.halftime },
  { scene: "fulltime", label: SCENE_LABELS.fulltime },
];

function take(scene: SceneType, side: Side | null = null, playerId: string | null = null): void {
  if (!latest) return;
  void setProgram(takeScene(scene, latest.scenes[scene].durationMs, Date.now(), { side, playerId }));
}

export function initScenePanel(root: HTMLElement): void {
  root.innerHTML = `
    <div class="panel-title">Scenes</div>
    <div class="panel-body">
      <div class="scene-grid">
        ${QUICK_TAKES.map(
          (t, i) => `<button data-take="${i}" type="button" class="scene-btn">${esc(t.label)}</button>`,
        ).join("")}
      </div>
      <div class="field">
        <label for="player-card-select">Player card</label>
        <div class="row" style="flex-wrap: nowrap;">
          <select id="player-card-select"></select>
          <button id="player-card-take" type="button" class="scene-btn" data-scene="playerCard">Take</button>
        </div>
      </div>
    </div>
  `;

  for (const btn of root.querySelectorAll<HTMLButtonElement>("[data-take]")) {
    const t = QUICK_TAKES[Number(btn.dataset.take)];
    btn.addEventListener("click", () => take(t.scene, t.side ?? null));
  }

  const select = root.querySelector<HTMLSelectElement>("#player-card-select")!;
  root.querySelector("#player-card-take")!.addEventListener("click", () => {
    const player = latest?.players.get(select.value);
    if (!player || !latest) return;
    const side = SIDES.find((s) => latest!.match.teams[s] === player.teamId) ?? "home";
    take("playerCard", side, player.id);
  });

  // Highlight what is on air, including auto-return to the scoreboard.
  setInterval(() => {
    if (!latest) return;
    const { program } = latest.match;
    const scene = activeScene(program, Date.now());
    for (const btn of root.querySelectorAll<HTMLButtonElement>("[data-take]")) {
      const t = QUICK_TAKES[Number(btn.dataset.take)];
      btn.classList.toggle("on-air", t.scene === scene && (!t.side || t.side === program.side));
    }
    root.querySelector("#player-card-take")!.classList.toggle("on-air", scene === "playerCard");
  }, 250);
}

export function updateScenePanel(root: HTMLElement, data: LiveData): void {
  latest = data;
  const sides = sidesWithPlayers(data.match);
  for (const btn of root.querySelectorAll<HTMLElement>("[data-take]")) {
    const t = QUICK_TAKES[Number(btn.dataset.take)];
    btn.hidden = t.scene === "lineup" && t.side !== undefined && !sides.includes(t.side);
  }

  const key = sides.map((s) => `${data.teams[s]?.name}:${matchPlayers(data, s).map((p) => p.id + p.name).join(",")}`).join("|");
  if (key === playersKey) return;
  playersKey = key;

  const select = root.querySelector<HTMLSelectElement>("#player-card-select")!;
  const previous = select.value;
  select.innerHTML = sides
    .filter((s) => matchPlayers(data, s).length)
    .map(
      (s) => `
        <optgroup label="${esc(data.teams[s]?.name ?? s)}">
          ${matchPlayers(data, s)
            .map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)
            .join("")}
        </optgroup>
      `,
    )
    .join("");
  if (data.players.has(previous)) select.value = previous;
}
