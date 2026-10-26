import type { GraphicsSettings, SceneType } from "@shared/types";
import { useEffect, useRef, useState } from "react";
import { cn } from "./ui";

/** The output page's design canvas (see overlay.css). */
const CANVAS_WIDTH = 2304;
const CANVAS_HEIGHT = 1024;

/** The output page's address, next to this one in every environment (for the Browser Source). */
export const overlayUrl = () => new URL("../overlay/overlay.html", location.href).href;

/**
 * Embeds the real output page, scaled to fit, so the preview always matches what goes
 * on air. `scene` forces a scene in this preview only (null follows what's on air), and
 * `graphics` shows an unsaved theme and colours (null shows the saved ones).
 */
export function OutputPreview({
  scene = null,
  graphics = null,
  className,
}: {
  scene?: SceneType | null;
  graphics?: GraphicsSettings | null;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [src] = useState(() => {
    const url = new URL(overlayUrl());
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

  const post = (message: object) => frameRef.current?.contentWindow?.postMessage(message, location.origin);
  const sendScene = () => post({ type: "preview-scene", scene });
  const sendGraphics = () => post({ type: "preview-graphics", graphics });
  useEffect(sendScene, [scene]);
  useEffect(sendGraphics, [graphics]);

  return (
    <div ref={boxRef} className={cn("relative aspect-[2304/1024] overflow-hidden rounded-sm bg-black", className)}>
      <iframe
        ref={frameRef}
        title="Output preview"
        tabIndex={-1}
        src={src}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onLoad={() => {
          sendScene();
          sendGraphics();
        }}
        className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
      />
    </div>
  );
}
