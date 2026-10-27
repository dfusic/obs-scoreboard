import { OUTPUT_CHANNEL, type OutputFullscreenMessage, type OutputStateMessage } from "@shared/outputWindow";

/** How often the wake lock is checked, in case the system released it. */
const WAKE_LOCK_RETRY_MS = 30_000;

/**
 * The output shown full screen on a projector / second screen: fullscreen on request from the
 * control page (or on the first click / key press here), and never letting the display sleep.
 * Only for the top-level page: the control page's previews embed this page in iframes.
 */
export function setUpDisplay(bgVideo: HTMLVideoElement) {
  if (window.top !== window) return;

  const enterFullscreen = () => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
  };
  const exitFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  };

  // Fallback where fullscreen can't be passed from the control page (other browsers, a plain tab).
  document.addEventListener("click", enterFullscreen);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") enterFullscreen();
  });

  // The control page's Fullscreen button passes its click on with the message.
  window.addEventListener("message", (e: MessageEvent<OutputFullscreenMessage>) => {
    if (e.origin !== location.origin || e.data?.type !== "output-fullscreen") return;
    if (e.data.on) enterFullscreen();
    else exitFullscreen();
  });

  const report = (open = true) => {
    const message: OutputStateMessage = { type: "output-state", open, fullscreen: !!document.fullscreenElement };
    try {
      window.opener?.postMessage(message, location.origin);
    } catch {
      // Opener closed or navigated away.
    }
  };
  report();
  document.addEventListener("fullscreenchange", () => report());
  window.addEventListener("pagehide", () => report(false));
  new BroadcastChannel(OUTPUT_CHANNEL).onmessage = () => report();

  // Screen Wake Lock: no display sleep or screensaver while the output is visible. The browser
  // drops the lock whenever the page is hidden, so take it again when it's visible.
  let wakeLock: WakeLockSentinel | null = null;
  const keepAwake = async () => {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
    if (wakeLock && !wakeLock.released) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch {
      // Not allowed right now (e.g. battery saver); retried below.
    }
  };
  void keepAwake();
  setInterval(() => void keepAwake(), WAKE_LOCK_RETRY_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    void keepAwake();
    // The browser may pause the background video while hidden.
    if (bgVideo.paused) void bgVideo.play().catch(() => {});
  });
}
