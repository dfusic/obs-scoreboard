import { resetMatch, setScore } from "@shared/matchRepo";

export function initActionsPanel(root: HTMLElement): void {
  root.innerHTML = `
    <div class="panel-title">Quick Actions</div>
    <div class="panel-body" style="gap: 8px;">
      <button id="reset-scores-btn" type="button" class="btn-wide">Reset all scores</button>
      <button id="reset-match-btn" type="button" class="btn-danger">Full reset</button>
    </div>
  `;

  root.querySelector("#reset-scores-btn")!.addEventListener("click", () => {
    void Promise.all([setScore("home", 0), setScore("away", 0)]);
  });

  root.querySelector("#reset-match-btn")!.addEventListener("click", () => {
    if (confirm("Full reset? This clears the score, clock and logos.")) {
      void resetMatch();
    }
  });
}
