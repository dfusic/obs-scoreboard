import { resetMatch, resetScores } from "@shared/matchRepo";
import type { MatchState } from "@shared/types";

let latestMatch: MatchState | null = null;

export function initActionsPanel(root: HTMLElement): void {
  root.innerHTML = `
    <div class="panel-title">Quick Actions</div>
    <div class="panel-body" style="gap: 8px;">
      <button id="reset-scores-btn" type="button" class="btn-wide">Reset scores &amp; goals</button>
      <button id="reset-match-btn" type="button" class="btn-danger">Full reset</button>
    </div>
  `;

  root.querySelector("#reset-scores-btn")!.addEventListener("click", () => {
    if (confirm("Reset both scores and clear the goal list?")) void resetScores();
  });

  root.querySelector("#reset-match-btn")!.addEventListener("click", () => {
    if (
      latestMatch &&
      confirm("Full reset? This clears the score, goals and clock and returns to the scoreboard. Teams and lineups stay.")
    ) {
      void resetMatch(latestMatch);
    }
  });
}

export function updateActionsPanel(match: MatchState): void {
  latestMatch = match;
}
