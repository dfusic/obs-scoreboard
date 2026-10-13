import { esc } from "@shared/html";
import { matchPlayers, sidesWithPlayers, type LiveData } from "@shared/liveFeed";
import { recordGoal, removeLastGoal } from "@shared/matchRepo";
import { takeScene } from "@shared/program";
import { SIDES, type Player, type Side } from "@shared/types";

let latest: LiveData | null = null;
/** Squad shown in each side's scorer picker, to skip re-rendering unchanged lists. */
const pickerKeys: Record<Side, string> = { home: "", away: "" };

function sideCardHtml(side: Side): string {
  const label = side === "home" ? "Home" : "Away";
  return `
    <div class="panel" data-side="${side}">
      <div class="panel-title" data-role="title">${label}</div>
      <div class="panel-body">
        <div class="row" style="justify-content: space-between; flex-wrap: nowrap;">
          <button data-delta="-1" type="button" class="score-btn minus" aria-label="Remove ${label} goal">&minus;</button>
          <span data-role="score" class="score-value">0</span>
          <button data-delta="1" type="button" class="score-btn" aria-label="Add ${label} goal without a scorer">+</button>
        </div>
        <button data-role="goal" type="button" class="btn-goal">Goal!</button>
        <div data-role="picker" class="scorer-picker" hidden>
          <div class="picker-title">Who scored?</div>
          <div data-role="players" class="picker-list"></div>
          <div class="row">
            <button data-scorer="" type="button" class="btn-ghost">Unknown scorer</button>
            <div class="spacer"></div>
            <button data-role="cancel" type="button" class="btn-ghost">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function playerButton(p: Player): string {
  return `<button data-scorer="${esc(p.id)}" type="button" class="picker-player">${esc(p.name)}</button>`;
}

/** Adds the goal and puts the goal-scorer scene on air. */
function scoreGoal(side: Side, playerId: string | null): void {
  if (!latest) return;
  const program = takeScene("goal", latest.scenes.goal.durationMs, Date.now(), { side, playerId });
  void recordGoal(side, playerId, program);
}

export function initScorePanel(root: HTMLElement): void {
  root.innerHTML = SIDES.map(sideCardHtml).join("");

  for (const side of SIDES) {
    const card = root.querySelector<HTMLElement>(`[data-side="${side}"]`)!;
    const picker = card.querySelector<HTMLElement>('[data-role="picker"]')!;

    card.querySelector('[data-delta="1"]')!.addEventListener("click", () => void recordGoal(side, null, null));
    card.querySelector('[data-delta="-1"]')!.addEventListener("click", () => void removeLastGoal(side));
    card.querySelector('[data-role="goal"]')!.addEventListener("click", () => {
      // Without player data for this side there is nobody to pick: go straight on air.
      if (latest && !sidesWithPlayers(latest.match).includes(side)) scoreGoal(side, null);
      else picker.hidden = !picker.hidden;
    });
    card.querySelector('[data-role="cancel"]')!.addEventListener("click", () => {
      picker.hidden = true;
    });
    // Delegated: the player list is re-rendered when the squad changes.
    picker.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-scorer]");
      if (!btn) return;
      scoreGoal(side, btn.dataset.scorer || null);
      picker.hidden = true;
    });
  }
}

export function updateScorePanel(root: HTMLElement, data: LiveData): void {
  latest = data;
  for (const side of SIDES) {
    const card = root.querySelector<HTMLElement>(`[data-side="${side}"]`)!;
    const team = data.teams[side];
    card.querySelector('[data-role="title"]')!.textContent = team ? team.name : side === "home" ? "Home" : "Away";
    card.querySelector('[data-role="score"]')!.textContent = String(data.match.score[side]);

    const squad = matchPlayers(data, side);
    const key = squad.map((p) => `${p.id}:${p.name}`).join("|");
    if (pickerKeys[side] !== key) {
      pickerKeys[side] = key;
      card.querySelector('[data-role="players"]')!.innerHTML = squad.length
        ? squad.map(playerButton).join("")
        : `<span class="hint">No players. Add them on the Setup page, then pick the lineup.</span>`;
    }
  }
}
