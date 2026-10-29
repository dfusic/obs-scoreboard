import type { LiveData } from "@shared/liveFeed";
import type { SceneType } from "@shared/types";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { OverlayDocumentProvider } from "../overlay/context";
import { OverlayView } from "../overlay/Overlay";
import overlayCss from "../overlay/overlay.css?inline";
import { cn } from "./ui";

/** The output page's design canvas (see overlay.css). */
const CANVAS_WIDTH = 2304;
const CANVAS_HEIGHT = 1024;

/** Same font link as overlay.html. */
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Big+Shoulders:opsz,wght@10..72,400..800&display=swap";

const BG_VIDEO = `${import.meta.env.BASE_URL}media/SemaforBG.mp4`;
/** Half speed, as on the output page (main.tsx). */
const BG_PLAYBACK_RATE = 0.5;
/** Where a still's video rests: an early frame, past any black start. */
const STILL_VIDEO_TIME_S = 0.5;

/**
 * The iframe's document: the output page's head (font, overlay.css) and an empty body the
 * preview renders into. `static` on body for stills (see overlay.css, static mode).
 */
const frameDoc = (still: boolean) =>
  `<!doctype html><html lang="en"><head><meta charset="UTF-8" />` +
  `<link rel="preconnect" href="https://fonts.googleapis.com" />` +
  `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />` +
  `<link href="${FONT_HREF}" rel="stylesheet" />` +
  `<style>${overlayCss}</style></head>` +
  `<body${still ? ' class="static"' : ""} data-scene="scoreboard"></body></html>`;

/** Scales the iframe (laid out at the canvas size) to the box's width. Re-run when the iframe appears. */
function useCanvasScale(boxRef: RefObject<HTMLDivElement | null>, frameRef: RefObject<HTMLIFrameElement | null>, active: boolean) {
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
 * The default background video, as on the output page (static in overlay.html there).
 * `muted` is set as a property: React doesn't render the attribute that autoplay needs.
 * A still rests on an early frame instead of playing.
 */
function BackgroundVideo({ still }: { still: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current!;
    video.muted = true;
    video.defaultPlaybackRate = BG_PLAYBACK_RATE;
    video.playbackRate = BG_PLAYBACK_RATE;
    const onMetadata = () => {
      if (still) video.currentTime = STILL_VIDEO_TIME_S;
      else video.playbackRate = BG_PLAYBACK_RATE;
    };
    video.addEventListener("loadedmetadata", onMetadata);
    // Metadata may be loaded already (cached video): then no event comes, so seek now.
    if (still && video.readyState >= HTMLMediaElement.HAVE_METADATA) onMetadata();
    if (!still) void video.play().catch(() => {});
    return () => video.removeEventListener("loadedmetadata", onMetadata);
  }, [still]);
  return <video ref={ref} className="bg-video" src={BG_VIDEO} loop={!still} playsInline preload="auto" />;
}

const frameClass = "pointer-events-none absolute top-0 left-0 origin-top-left border-0";

/**
 * A preview of the output, scaled to fit: the overlay's own scenes (`OverlayView`) rendered
 * from `data` into a same-origin iframe laid out at the 2304x1024 canvas, so the page's
 * CSS (vw sizes, body attributes, transition variables) applies as on air. Nothing is
 * posted: a changed `data` (e.g. a Graphics draft) re-renders it at once.
 *
 * `scene` shows that scene (null: what's on air); changing `replay` (a counter) plays the
 * transition again onto it. `still`: a gallery thumbnail of `scene`, only that scene,
 * settled, with the video paused (or no video when the scene has its own background image
 * or the scheme a background colour); its iframe exists only while it is in or near view.
 * `active: false` drops the iframe (video, blur, timers) until it is active again, e.g.
 * while its page is hidden.
 */
export function ScenePreview({
  data,
  scene,
  replay = 0,
  still = false,
  active = true,
  className,
}: {
  data: LiveData;
  scene: SceneType | null;
  replay?: number;
  still?: boolean;
  active?: boolean;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [srcDoc] = useState(() => frameDoc(still));
  // Stills have an iframe only while (nearly) in view: created as one scrolls in, dropped as it leaves.
  const [inView, setInView] = useState(!still);
  const [doc, setDoc] = useState<Document | null>(null);
  const mounted = active && inView;
  // The video only shows where nothing covers it: a still of a scene with its own image
  // or on a scheme background colour doesn't load it (see OverlayView's background).
  const video =
    !still || scene === null || (data.scenes[scene].background === null && data.graphics.colors.background === null);

  useEffect(() => {
    if (!still) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setInView(entry.isIntersecting);
      },
      { rootMargin: "200px" },
    );
    observer.observe(boxRef.current!);
    return () => observer.disconnect();
  }, [still]);
  useCanvasScale(boxRef, frameRef, mounted);
  // A dropped iframe takes its document with it; the next one loads a new one.
  useEffect(() => {
    if (!mounted) setDoc(null);
  }, [mounted]);

  return (
    <div ref={boxRef} className={cn("relative aspect-[2304/1024] overflow-hidden rounded-sm bg-black", className)}>
      {mounted && (
        <iframe
          ref={frameRef}
          title={still ? "" : "Output preview"}
          aria-hidden={still || undefined}
          tabIndex={-1}
          srcDoc={srcDoc}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onLoad={() => setDoc(frameRef.current?.contentDocument ?? null)}
          className={frameClass}
        />
      )}
      {mounted &&
        doc &&
        createPortal(
          <OverlayDocumentProvider value={doc}>
            {video && <BackgroundVideo still={still} />}
            <OverlayView data={data} previewScene={scene} replay={replay} isStatic={still} />
          </OverlayDocumentProvider>,
          doc.body,
        )}
    </div>
  );
}
