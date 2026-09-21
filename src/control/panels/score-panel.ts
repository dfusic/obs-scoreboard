import { setScore } from "@shared/matchRepo";
import type { MatchState, Team } from "@shared/types";

let latestScore: MatchState["score"] = { home: 0, away: 0 };

function teamCardHtml(team: Team): string {
  const label = team === "home" ? "Home" : "Away";
  return `
    <div class="panel">
      <div class="panel-title">${label} - Score</div>
      <div class="panel-body">
        <div class="row" style="justify-content: space-between; flex-wrap: nowrap;">
          <button data-team="${team}" data-delta="-1" type="button" class="score-btn minus" aria-label="Decrease ${label} score">&minus;</button>
          <span id="${team}-score-readout" class="score-value">0</span>
          <button data-team="${team}" data-delta="1" type="button" class="score-btn" aria-label="Increase ${label} score">+</button>
        </div>
      </div>
    </div>
  `;
}

export function initScorePanel(root: HTMLElement): void {
  root.innerHTML = teamCardHtml("home") + teamCardHtml("away");

  for (const btn of root.querySelectorAll<HTMLButtonElement>("[data-delta]")) {
    btn.addEventListener("click", () => {
      const team = btn.dataset.team as Team;
      void setScore(team, latestScore[team] + Number(btn.dataset.delta));
    });
  }
}

export function updateScorePanel(root: HTMLElement, match: MatchState): void {
  latestScore = match.score;
  root.querySelector("#home-score-readout")!.textContent = String(match.score.home);
  root.querySelector("#away-score-readout")!.textContent = String(match.score.away);
}
