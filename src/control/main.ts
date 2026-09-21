import { describeAuthError, onAuthChange, signIn, signOut } from "@shared/auth";
import { ensureMatchInitialized, subscribeToMatch } from "@shared/matchRepo";
import { initActionsPanel } from "./panels/actions-panel";
import { initClockPanel, updateClockPanel } from "./panels/clock-panel";
import { initLogoPanel, updateLogoPanel } from "./panels/logo-panel";
import { initPreviewPanel, updatePreviewPanel } from "./panels/preview-panel";
import { initScorePanel, updateScorePanel } from "./panels/score-panel";

const loginSection = document.getElementById("login-section")!;
const appSection = document.getElementById("app-section")!;
const loginForm = document.getElementById("login-form") as HTMLFormElement;
const usernameInput = document.getElementById("login-username") as HTMLInputElement;
const passwordInput = document.getElementById("login-password") as HTMLInputElement;
const loginError = document.getElementById("login-error")!;
const loginSubmit = document.getElementById("login-submit") as HTMLButtonElement;

const previewPanel = document.getElementById("preview-panel")!;
const scorePanel = document.getElementById("score-panel")!;
const clockPanel = document.getElementById("clock-panel")!;
const logoPanel = document.getElementById("logo-panel")!;
const statusDot = document.getElementById("status-dot")!;
const statusLabel = document.getElementById("status-label")!;

initPreviewPanel(previewPanel);
initScorePanel(scorePanel);
initClockPanel(clockPanel);
initLogoPanel(logoPanel);
initActionsPanel(document.getElementById("actions-panel")!);

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

document.getElementById("sign-out-btn")!.addEventListener("click", () => {
  void signOut();
});

let started = false;

/** Match data is only loaded/created once someone is signed in. */
function startDashboard(): void {
  if (started) return;
  started = true;

  void ensureMatchInitialized();

  subscribeToMatch((match) => {
    updatePreviewPanel(previewPanel, match);
    updateScorePanel(scorePanel, match);
    updateClockPanel(clockPanel, match.clock);
    updateLogoPanel(logoPanel, match);

    statusDot.classList.toggle("live", match.clock.running);
    statusLabel.classList.toggle("live", match.clock.running);
    statusLabel.textContent = match.clock.running ? "Live" : "Paused";
  });
}

onAuthChange((user) => {
  loginSection.hidden = user !== null;
  appSection.hidden = user === null;
  if (user) startDashboard();
});
