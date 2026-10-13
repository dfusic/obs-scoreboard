import { describeAuthError, onAuthChange, signIn, signOut } from "@shared/auth";
import { APP_ENV } from "@shared/firebase";
import { subscribeToLive } from "@shared/liveFeed";
import { ensureMatchInitialized } from "@shared/matchRepo";
import { subscribeToTeams } from "@shared/teamRepo";
import type { MatchState, TeamProfile } from "@shared/types";
import { initActionsPanel, updateActionsPanel } from "./live/actions-panel";
import { initClockPanel, updateClockPanel } from "./live/clock-panel";
import { initLineupPanel, updateLineupPanel } from "./live/lineup-panel";
import { initPresentationPanel, updatePresentationPanel } from "./live/presentation-panel";
import { initMatchPanel, updateMatchPanel } from "./live/match-panel";
import { initPreviewPanel, updatePreviewPanel } from "./live/preview-panel";
import { initScenePanel, updateScenePanel } from "./live/scene-panel";
import { initScorePanel, updateScorePanel } from "./live/score-panel";
import { initRouter, onPageShown } from "./router";
import { initRosterPanel, showRosterFor } from "./setup/roster-panel";
import { initSceneSettingsPanel, showSceneSettings, updateSceneSettingsPanel } from "./setup/scene-settings-panel";
import { initTeamsPanel, updateTeamsPanel } from "./setup/teams-panel";

const loginSection = document.getElementById("login-section")!;
const appSection = document.getElementById("app-section")!;
const loginForm = document.getElementById("login-form") as HTMLFormElement;
const usernameInput = document.getElementById("login-username") as HTMLInputElement;
const passwordInput = document.getElementById("login-password") as HTMLInputElement;
const loginError = document.getElementById("login-error")!;
const loginSubmit = document.getElementById("login-submit") as HTMLButtonElement;

const panel = (id: string) => document.getElementById(id)!;
const previewPanel = panel("preview-panel");
const scorePanel = panel("score-panel");
const clockPanel = panel("clock-panel");
const matchPanel = panel("match-panel");
const scenePanel = panel("scene-panel");
const lineupPanel = panel("lineup-panel");
const presentationPanel = panel("presentation-panel");
const teamsPanel = panel("teams-panel");
const rosterPanel = panel("roster-panel");
const sceneSettingsPanel = panel("scene-settings-panel");
const statusDot = panel("status-dot");
const statusLabel = panel("status-label");

// Make it obvious when this isn't the production dashboard.
if (APP_ENV !== "production") {
  const label = APP_ENV === "development" ? "Local" : APP_ENV;
  document.title = `[${label.toUpperCase()}] ${document.title}`;
  for (const badge of document.querySelectorAll<HTMLElement>("[data-env-badge]")) {
    badge.textContent = label;
    badge.classList.toggle("local", APP_ENV === "development");
    badge.hidden = false;
  }
}

initPreviewPanel(previewPanel);
initScorePanel(scorePanel);
initClockPanel(clockPanel);
initMatchPanel(matchPanel);
initScenePanel(scenePanel);
initLineupPanel(lineupPanel);
initPresentationPanel(presentationPanel);
initActionsPanel(panel("actions-panel"));
initTeamsPanel(teamsPanel, (team) => showRosterFor(rosterPanel, team));
initRosterPanel(rosterPanel);
initSceneSettingsPanel(sceneSettingsPanel);

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginSubmit.disabled = true;
  try {
    await signIn(usernameInput.value, passwordInput.value);
    passwordInput.value = "";
  } catch (err) {
    loginError.textContent = describeAuthError(err);
    loginError.hidden = false;
  } finally {
    loginSubmit.disabled = false;
  }
});

// Writes are fire-and-forget (`void promise`), so surface failures instead of losing them silently.
const saveError = document.getElementById("save-error")!;
let saveErrorTimer: number | undefined;
window.addEventListener("unhandledrejection", (e) => {
  const code = (e.reason as { code?: string } | null)?.code;
  if (!code) return;
  console.error("Save failed:", e.reason);
  saveError.textContent =
    code === "permission-denied" ? "Not saved: no permission (signed out or rules not deployed)" : `Not saved: ${code}`;
  saveError.hidden = false;
  clearTimeout(saveErrorTimer);
  saveErrorTimer = window.setTimeout(() => (saveError.hidden = true), 8000);
});

document.getElementById("sign-out-btn")!.addEventListener("click", () => {
  void signOut();
});

let started = false;

/** Match data is only loaded/created once someone is signed in. */
function startDashboard(): void {
  if (started) return;
  started = true;

  void ensureMatchInitialized();

  let teams: TeamProfile[] = [];
  let match: MatchState | null = null;

  /**
   * Runs one panel's update. Panels click-handle from the data they were last given,
   * so a panel that throws must not stop the others from getting fresh data.
   */
  const safely = (panelName: string, update: () => void) => {
    try {
      update();
    } catch (err) {
      console.error(`${panelName} panel failed to update:`, err);
    }
  };

  subscribeToTeams((next) => {
    teams = next;
    safely("Teams", () => updateTeamsPanel(teamsPanel, teams));
    if (match) safely("Match", () => updateMatchPanel(matchPanel, teams, match!));
  });

  subscribeToLive((data) => {
    match = data.match;
    safely("Player intro", () => updatePresentationPanel(presentationPanel, data));
    safely("Preview", () => updatePreviewPanel(data.match.program));
    safely("Score", () => updateScorePanel(scorePanel, data));
    safely("Clock", () => updateClockPanel(clockPanel, data.match.clock));
    safely("Match", () => updateMatchPanel(matchPanel, teams, data.match));
    safely("Scenes", () => updateScenePanel(scenePanel, data));
    safely("Lineup", () => updateLineupPanel(lineupPanel, data));
    safely("Actions", () => updateActionsPanel(data.match));
    safely("Scene settings", () => updateSceneSettingsPanel(sceneSettingsPanel, data.scenes));

    statusDot.classList.toggle("live", data.match.clock.running);
    statusLabel.classList.toggle("live", data.match.clock.running);
    statusLabel.textContent = data.match.clock.running ? "Live" : "Paused";
  });

  onPageShown((page) => {
    if (page === "setup") showSceneSettings(sceneSettingsPanel);
  });
  initRouter();
}

onAuthChange((user) => {
  loginSection.hidden = user !== null;
  appSection.hidden = user === null;
  if (user) startDashboard();
});
