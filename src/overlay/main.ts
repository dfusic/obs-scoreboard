import { formatClock } from "@shared/clock";
import { setImageSrc } from "@shared/image";
import { matchPlayers, subscribeToLive, type LiveData } from "@shared/liveFeed";
import { activeScene } from "@shared/program";
import { SCENE_TYPES, type SceneType } from "@shared/types";
import { SCENE_RENDERERS, type SceneTarget } from "./scenes";

const clockMinEl = document.getElementById("clock-min")!;
const clockSecEl = document.getElementById("clock-sec")!;
const homeScoreEl = document.getElementById("home-score")!;
const awayScoreEl = document.getElementById("away-score")!;
const homeLogoEl = document.getElementById("home-logo") as HTMLImageElement;
const awayLogoEl = document.getElementById("away-logo") as HTMLImageElement;
const bgImage = document.querySelector<HTMLImageElement>(".bg-image")!;
const layers = new Map(
  [...document.querySelectorAll<HTMLElement>("[data-layer]")].map((el) => [el.dataset.layer as SceneType, el]),
);

const isScene = (v: unknown): v is SceneType => (SCENE_TYPES as readonly unknown[]).includes(v);

/**
 * Preview override: the dashboard shows a scene without putting it on air, via
 * ?scene=<type> or a postMessage from the page embedding this one.
 */
let previewScene: SceneType | null = null;
const sceneParam = new URLSearchParams(location.search).get("scene");
if (isScene(sceneParam)) previewScene = sceneParam;

window.addEventListener("message", (e) => {
  if (e.origin !== location.origin || e.data?.type !== "preview-scene") return;
  previewScene = isScene(e.data.scene) ? e.data.scene : null;
  render();
  tick();
});

let latest: LiveData | null = null;
const renderedHtml = new Map<SceneType, string>();

/** Who the scene is about. Previews fall back to the home side and its first player. */
function sceneTarget(data: LiveData): SceneTarget {
  const { program } = data.match;
  const side = program.side ?? "home";
  const player = (program.playerId && data.players.get(program.playerId)) || null;
  if (previewScene && !player) return { side, player: matchPlayers(data, side)[0] ?? null };
  return { side, player };
}

function render(): void {
  const data = latest;
  if (!data) return;

  homeScoreEl.textContent = String(data.match.score.home);
  awayScoreEl.textContent = String(data.match.score.away);
  setImageSrc(homeLogoEl, data.teams.home?.logo ?? null);
  setImageSrc(awayLogoEl, data.teams.away?.logo ?? null);

  const target = sceneTarget(data);
  for (const type of Object.keys(SCENE_RENDERERS) as (keyof typeof SCENE_RENDERERS)[]) {
    const html = SCENE_RENDERERS[type](data, data.scenes[type], target);
    // Only touch the DOM on change, so inline images aren't re-decoded every snapshot.
    if (renderedHtml.get(type) !== html) {
      layers.get(type)!.innerHTML = html;
      renderedHtml.set(type, html);
      fitText();
    }
    layers.get(type)!.style.setProperty("--accent", data.scenes[type].accentColor);
  }
}

/** Shrinks lines inside [data-fit] boxes that are wider than the box (long player names). */
function fitText(): void {
  for (const box of document.querySelectorAll<HTMLElement>("[data-fit]")) {
    for (const line of box.children as HTMLCollectionOf<HTMLElement>) {
      line.style.fontSize = "";
      const overflow = line.scrollWidth / box.clientWidth;
      if (overflow > 1) {
        line.style.fontSize = `${parseFloat(getComputedStyle(line).fontSize) / overflow}px`;
      }
    }
  }
}
window.addEventListener("resize", fitText);
void document.fonts.ready.then(fitText);

let shownScene: SceneType | null = null;

function tick(): void {
  if (!latest) return;
  const scene = previewScene ?? activeScene(latest.match.program, Date.now());

  const [minutes, seconds] = formatClock(latest.match.clock, Date.now()).split(":");
  clockMinEl.textContent = minutes;
  clockSecEl.textContent = seconds;

  if (scene !== shownScene) {
    shownScene = scene;
    document.body.dataset.scene = scene;
    for (const [type, el] of layers) el.classList.toggle("active", type === scene);
  }

  // A scene's own background image replaces the default video.
  const background = latest.scenes[scene].background;
  setImageSrc(bgImage, background);
  document.body.classList.toggle("has-bg-image", background !== null);
}

subscribeToLive((data) => {
  latest = data;
  render();
  tick();
});

const CLOCK_TICK_MS = 250;
setInterval(tick, CLOCK_TICK_MS);

// Half-speed background loop. Set after metadata loads so it survives loop restarts.
const bgVideo = document.querySelector<HTMLVideoElement>(".bg-video")!;
const BG_PLAYBACK_RATE = 0.5;
bgVideo.defaultPlaybackRate = BG_PLAYBACK_RATE;
bgVideo.playbackRate = BG_PLAYBACK_RATE;
bgVideo.addEventListener("loadedmetadata", () => {
  bgVideo.playbackRate = BG_PLAYBACK_RATE;
});
