import { esc } from "@shared/html";
import { setMatchTeam } from "@shared/matchRepo";
import { SIDES, type MatchState, type TeamProfile } from "@shared/types";
import { setFieldValue } from "../dom";

let teamsKey = "";

export function initMatchPanel(root: HTMLElement): void {
  root.innerHTML = `
    <div class="panel-title">Match</div>
    <div class="panel-body">
      ${SIDES.map(
        (side) => `
          <div class="field">
            <label for="match-${side}">${side === "home" ? "Home team" : "Away team"}</label>
            <select id="match-${side}" data-side="${side}"></select>
          </div>
        `,
      ).join("")}
      <a href="#/setup" class="hint">Add or edit teams in Setup</a>
    </div>
  `;

  for (const select of root.querySelectorAll<HTMLSelectElement>("select[data-side]")) {
    select.addEventListener("change", () => {
      void setMatchTeam(select.dataset.side as "home" | "away", select.value || null);
    });
  }
}

export function updateMatchPanel(root: HTMLElement, teams: TeamProfile[], match: MatchState): void {
  const key = teams.map((t) => `${t.id}:${t.name}`).join("|");
  const selects = root.querySelectorAll<HTMLSelectElement>("select[data-side]");
  if (key !== teamsKey) {
    teamsKey = key;
    const options = teams.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");
    for (const select of selects) {
      select.innerHTML = `<option value="">— Pick a team —</option>${options}`;
      select.value = "";
    }
  }
  for (const select of selects) {
    setFieldValue(select, match.teams[select.dataset.side as "home" | "away"] ?? "");
  }
}
