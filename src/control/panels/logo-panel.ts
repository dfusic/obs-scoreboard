import { fileToResizedDataUrl } from "@shared/image";
import { setLogo } from "@shared/matchRepo";
import type { MatchState, Team } from "@shared/types";

const LOGO_MAX_DIMENSION = 600;

const IMAGE_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
const UPLOAD_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;

function teamCardHtml(team: Team): string {
  const label = team === "home" ? "Home" : "Away";
  return `
    <div class="panel" data-team="${team}">
      <div class="panel-title">${label} logo</div>
      <div class="panel-body">
        <div class="logo-row">
          <div class="logo-thumb" data-role="thumb">${IMAGE_ICON}</div>
          <div class="logo-actions">
            <label class="upload-btn">
              ${UPLOAD_ICON} Upload logo
              <input data-role="file" type="file" accept="image/*" />
            </label>
            <button data-role="clear" type="button" class="btn-ghost logo-remove" hidden>Remove</button>
          </div>
        </div>
        <span data-role="status" class="error-text" hidden></span>
      </div>
    </div>
  `;
}

export function initLogoPanel(root: HTMLElement): void {
  root.innerHTML = teamCardHtml("home") + teamCardHtml("away");

  for (const team of ["home", "away"] as const) {
    const card = root.querySelector(`[data-team="${team}"]`)!;
    const input = card.querySelector('[data-role="file"]') as HTMLInputElement;
    const status = card.querySelector('[data-role="status"]') as HTMLElement;

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      status.hidden = false;
      status.textContent = "Processing...";
      try {
        await setLogo(team, await fileToResizedDataUrl(file, LOGO_MAX_DIMENSION));
        status.hidden = true;
      } catch (err) {
        status.textContent = err instanceof Error ? err.message : "Could not process image";
      } finally {
        input.value = "";
      }
    });

    card.querySelector('[data-role="clear"]')!.addEventListener("click", () => {
      void setLogo(team, null);
    });
  }
}

export function updateLogoPanel(root: HTMLElement, match: MatchState): void {
  for (const team of ["home", "away"] as const) {
    const card = root.querySelector(`[data-team="${team}"]`)!;
    const thumb = card.querySelector('[data-role="thumb"]') as HTMLElement;
    const clear = card.querySelector('[data-role="clear"]') as HTMLElement;
    const url = match.logos[team];
    const img = thumb.querySelector("img");

    clear.hidden = !url;
    if (url) {
      if (img) {
        if (img.getAttribute("src") !== url) img.src = url;
      } else {
        thumb.innerHTML = `<img alt="${team} logo" />`;
        thumb.querySelector("img")!.src = url;
      }
    } else if (img) {
      thumb.innerHTML = IMAGE_ICON;
    }
  }
}
