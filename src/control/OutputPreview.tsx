import type { SceneType } from "@shared/types";
import { useEffect, useRef, useState } from "react";

/** The output page's design canvas (see overlay.css). */
const CANVAS_WIDTH = 2304;
const CANVAS_HEIGHT = 1024;

/**
 * Embeds the real output page, scaled to fit, so the preview always matches what goes
 * on air. `scene` forces a scene in this preview only (null follows what's on air).
 */
export function OutputPreview({ scene = null }: { scene?: SceneType | null }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [src] = useState(() => {
    const url = new URL("../overlay/overlay.html", location.href);
    if (scene) url.searchParams.set("scene", scene);
    return url.href;
  });

  useEffect(() => {
    const box = boxRef.current!;
    const observer = new ResizeObserver(() => {
      frameRef.current!.style.transform = `scale(${box.clientWidth / CANVAS_WIDTH})`;
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const send = () =>
    frameRef.current?.contentWindow?.postMessage({ type: "preview-scene", scene }, location.origin);
  useEffect(send, [scene]);

  return (
    <div ref={boxRef} className="relative aspect-[2304/1024] overflow-hidden rounded-sm bg-black">
      <iframe
        ref={frameRef}
        title="Output preview"
        tabIndex={-1}
        src={src}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onLoad={send}
        className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
      />
    </div>
  );
}
