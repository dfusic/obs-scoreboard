import { formatClock } from "@shared/clock";
import { subscribeToMatch } from "@shared/matchRepo";
import { createInitialMatchState, type MatchState } from "@shared/types";

const clockMinEl = document.getElementById("clock-min")!;
const clockSecEl = document.getElementById("clock-sec")!;
const homeScoreEl = document.getElementById("home-score")!;
const awayScoreEl = document.getElementById("away-score")!;
const homeLogoEl = document.getElementById("home-logo") as HTMLImageElement;
const awayLogoEl = document.getElementById("away-logo") as HTMLImageElement;

function setLogo(el: HTMLImageElement, url: string | null): void {
  if (url) {
    if (el.getAttribute("src") !== url) el.src = url;
  } else {
    el.removeAttribute("src");
  }
}

let latest: MatchState = createInitialMatchState();

subscribeToMatch((match) => {
  latest = match;
  homeScoreEl.textContent = String(match.score.home);
  awayScoreEl.textContent = String(match.score.away);
  setLogo(homeLogoEl, match.logos.home);
  setLogo(awayLogoEl, match.logos.away);
});

const CLOCK_TICK_MS = 250;
setInterval(() => {
  const [minutes, seconds] = formatClock(latest.clock, Date.now()).split(":");
  clockMinEl.textContent = minutes;
  clockSecEl.textContent = seconds;
}, CLOCK_TICK_MS);

// Half-speed background loop. Set after metadata loads so it survives loop restarts.
const bgVideo = document.querySelector<HTMLVideoElement>(".bg-video")!;
const BG_PLAYBACK_RATE = 0.5;
bgVideo.defaultPlaybackRate = BG_PLAYBACK_RATE;
bgVideo.playbackRate = BG_PLAYBACK_RATE;
bgVideo.addEventListener("loadedmetadata", () => {
  bgVideo.playbackRate = BG_PLAYBACK_RATE;
});
