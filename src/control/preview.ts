import type { SceneType } from "@shared/types";

/** The output page's design canvas (see overlay.css). */
const CANVAS_WIDTH = 2304;
const CANVAS_HEIGHT = 1024;

export interface Preview {
  /** Forces a scene in this preview only (null = follow what's on air). */
  setScene(scene: SceneType | null): void;
}

/**
 * Embeds the real output page, scaled to fit `root`, so the preview always
 * matches what goes on air.
 */
export function createOutputPreview(root: HTMLElement, initialScene: SceneType | null = null): Preview {
  const url = new URL("../overlay/overlay.html", location.href);
  if (initialScene) url.searchParams.set("scene", initialScene);

  root.classList.add("output-preview");
  root.innerHTML = `<iframe title="Output preview" tabindex="-1"></iframe>`;
  const iframe = root.querySelector("iframe")!;
  iframe.width = String(CANVAS_WIDTH);
  iframe.height = String(CANVAS_HEIGHT);
  iframe.src = url.href;

  new ResizeObserver(() => {
    iframe.style.transform = `scale(${root.clientWidth / CANVAS_WIDTH})`;
  }).observe(root);

  let scene = initialScene;
  const send = () =>
    iframe.contentWindow?.postMessage({ type: "preview-scene", scene }, location.origin);
  iframe.addEventListener("load", send);

  return {
    setScene(next) {
      scene = next;
      send();
    },
  };
}
