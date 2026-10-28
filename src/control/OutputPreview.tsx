import type { LiveData } from "@shared/liveFeed";
import { contentKey } from "./previewData";
import { isStaticReady, staticOutputUrl, type PreviewMessage } from "@shared/previewMessages";
import type { GraphicsSettings, SceneConfigs, SceneType } from "@shared/types";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { cn } from "./ui";

/** The output page's design canvas (see overlay.css). */
const CANVAS_WIDTH = 2304;
const CANVAS_HEIGHT = 1024;

/** The output page's address, next to this one in every environment (opened on the projector / second screen). */
export const overlayUrl = () => new URL("../overlay/overlay.html", location.href).href;

/** Scales the iframe (laid out at the canvas size) to the box's width. Re-run when the iframe appears. */
function useCanvasScale(boxRef: RefObject<HTMLDivElement | null>, frameRef: RefObject<HTMLIFrameElement | null>, active = true) {
  useEffect(() => {
    if (!active) return;
    const box = boxRef.current!;
    const observer = new ResizeObserver(() => {
      if (frameRef.current) frameRef.current.style.transform = `scale(${box.clientWidth / CANVAS_WIDTH})`;
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [active]);
}

/**
 * Posts preview messages to an iframe, each kind only when its content changed (payloads can
 * hold large data URLs). `resend()` posts them all again, for the iframe's `load`.
 */
function usePoster(frameRef: RefObject<HTMLIFrameElement | null>) {
  const sent = useRef(new Map<string, { key: string; message: PreviewMessage }>());
  const post = (message: PreviewMessage) => frameRef.current?.contentWindow?.postMessage(message, location.origin);
  return {
    send(message: PreviewMessage, key = contentKey(message)) {
      if (sent.current.get(message.type)?.key === key) return;
      sent.current.set(message.type, { key, message });
      post(message);
    },
    resend() {
      for (const { message } of sent.current.values()) post(message);
    },
    post,
  };
}

const frameClass = "pointer-events-none absolute top-0 left-0 origin-top-left border-0";

/**
 * Embeds the real output page, scaled to fit, so the preview always matches what goes
 * on air. `scene` forces a scene in this preview only (null follows what's on air),
 * `graphics` shows another look (null: the one on air) and `scenes` other settings for
 * the scenes it lists (merged over the on-air ones; null: all on air). Changing `replay`
 * (a counter) plays the transition again onto the scene shown. `active: false` drops the
 * iframe (a full output page: store listeners, video, blur) until it is active again, e.g.
 * while its page is hidden; the latest messages are posted again when it reloads.
 */
export function OutputPreview({
  scene = null,
  graphics = null,
  scenes = null,
  replay = 0,
  active = true,
  className,
}: {
  scene?: SceneType | null;
  graphics?: GraphicsSettings | null;
  scenes?: Partial<SceneConfigs> | null;
  replay?: number;
  active?: boolean;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [src] = useState(() => {
    const url = new URL(overlayUrl());
    if (scene) url.searchParams.set("scene", scene);
    return url.href;
  });
  useCanvasScale(boxRef, frameRef, active);

  const poster = usePoster(frameRef);
  useEffect(() => poster.send({ type: "preview-scene", scene }), [scene]);
  useEffect(() => poster.send({ type: "preview-graphics", graphics }), [graphics]);
  useEffect(() => poster.send({ type: "preview-scenes", scenes }), [scenes]);
  const replayed = useRef(replay);
  useEffect(() => {
    if (replay === replayed.current) return;
    replayed.current = replay;
    poster.post({ type: "preview-transition" });
  }, [replay]);

  return (
    <div ref={boxRef} className={cn("relative aspect-[2304/1024] overflow-hidden rounded-sm bg-black", className)}>
      {active && (
        <iframe
          ref={frameRef}
          title="Output preview"
          tabIndex={-1}
          src={src}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onLoad={() => poster.resend()}
          className={frameClass}
        />
      )}
    </div>
  );
}

/**
 * A still thumbnail of one scene: the output page in static mode (see `staticOutputUrl`),
 * fed `data` (trim it first, see `thumbnailData`). The iframe is created only once the
 * thumbnail scrolls into view, and `data` is posted only when its content changes.
 */
export function StaticScenePreview({ scene, data, className }: { scene: SceneType; data: LiveData; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [created, setCreated] = useState(false);
  const src = useMemo(() => staticOutputUrl(overlayUrl(), scene), [scene]);

  useEffect(() => {
    if (created) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setCreated(true);
    });
    observer.observe(boxRef.current!);
    return () => observer.disconnect();
  }, [created]);
  useCanvasScale(boxRef, frameRef, created);

  const poster = usePoster(frameRef);
  // The static page says when it listens (its load can come before its listener is set up):
  // send the data again then. The onLoad resend stays for older static pages.
  useEffect(() => {
    if (!created) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frameRef.current?.contentWindow || !isStaticReady(e.data)) return;
      poster.resend();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [created]);
  const key = useMemo(() => (created ? contentKey(data) : ""), [created, data]);
  useEffect(() => {
    if (created) poster.send({ type: "preview-data", data }, key);
  }, [key]);

  return (
    <div ref={boxRef} className={cn("relative aspect-[2304/1024] overflow-hidden bg-black", className)}>
      {created && (
        <iframe
          ref={frameRef}
          title=""
          aria-hidden="true"
          tabIndex={-1}
          src={src}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onLoad={() => poster.resend()}
          className={frameClass}
        />
      )}
    </div>
  );
}
