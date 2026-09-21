import { formatClock } from "@shared/clock";
import type { ClockState, MatchState, Team } from "@shared/types";

const PLACEHOLDER_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;

let latestClock: ClockState | null = null;

function teamHtml(team: Team): string {
  const label = team === "home" ? "Home" : "Away";
  return `
    <div class="preview-team">
      <div id="preview-${team}-logo" class="logo-placeholder">${PLACEHOLDER_ICON}</div>
      <div class="preview-label">${label}</div>
      <div id="preview-${team}-score" class="preview-score">0</div>
    </div>
  `;
}

export function initPreviewPanel(root: HTMLElement): void {
  root.innerHTML = `
    ${teamHtml("home")}
    <div class="preview-center"><div id="preview-timer" class="preview-timer">00:00</div></div>
    ${teamHtml("away")}
  `;

  setInterval(() => {
    if (latestClock) {
      root.querySelector("#preview-timer")!.textContent = formatClock(latestClock, Date.now());
    }
  }, 250);
}

export function updatePreviewPanel(root: HTMLElement, match: MatchState): void {
  latestClock = match.clock;
  for (const team of ["home", "away"] as const) {
    root.querySelector(`#preview-${team}-score`)!.textContent = String(match.score[team]);

    const logoSlot = root.querySelector(`#preview-${team}-logo`) as HTMLElement;
    const url = match.logos[team];
    const img = logoSlot.querySelector("img");
    if (url) {
      if (img) {
        if (img.getAttribute("src") !== url) img.src = url;
      } else {
        logoSlot.className = "";
        logoSlot.innerHTML = `<img class="preview-logo" alt="${team} logo" />`;
        logoSlot.querySelector("img")!.src = url;
      }
    } else if (img) {
      logoSlot.className = "logo-placeholder";
      logoSlot.innerHTML = PLACEHOLDER_ICON;
    }
  }
}
