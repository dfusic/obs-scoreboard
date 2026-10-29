import {
  FPS,
  frameAt,
  totalFrames,
  transition as findTransition,
  transitionFrame,
  type Transition,
  type TransitionFrame,
} from "@shared/transitions";
import { viewScene } from "@shared/program";
import type { SceneType } from "@shared/types";
import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useOverlayDocument } from "./context";

/**
 * Transitions run between views (programView() in shared/program.ts: scene and side), so
 * the same scene for the other side plays one too.
 */
interface Run {
  /** The view leaving; null when replaying the transition onto the current view. */
  from: string | null;
  to: string;
  def: Transition;
  /** performance.now() when it started. */
  startMs: number;
}

const VARS = ["--tr-out", "--tr-in", "--tr-in-linear", "--tr-a", "--tr-b", "--tr-logo", "--tr-swap"] as const;

/** Writes a frame's --tr-* variables on the overlay document's body. */
function writeFrame(body: HTMLElement, f: TransitionFrame) {
  const values = [f.out, f.in, f.inLinear, f.cover, f.reveal, f.logo, f.swapped ? 1 : 0];
  VARS.forEach((name, i) => body.style.setProperty(name, String(values[i])));
}

function clearFrame(body: HTMLElement) {
  for (const name of VARS) body.style.removeProperty(name);
}

/**
 * Moves the output from view to view (a scene, and its side) with the chosen transition
 * (shared/transitions.ts). React renders once when a transition starts and once when it
 * ends; in between, a requestAnimationFrame loop writes the --tr-* variables on body,
 * only when the 30 fps frame changes. Returns each scene's data-tr role (undefined =
 * hidden), the view leaving when it is the same scene as the one coming in (a side
 * change: the overlay draws it in a second section, `sameSceneOut`), the view shown
 * (switches at the swap, for the background), and the running transition (with its
 * start time, which a retarget keeps), for the curtain.
 *
 * A new target before a transition swaps views replaces its destination; after that,
 * the next transition starts when this one ends. `replay` (a counter) plays the
 * transition onto the current view, for the Graphics preview.
 */
export function useSceneTransition(target: string, transitionId: string, replay: number) {
  const { body } = useOverlayDocument();
  const [current, setCurrent] = useState<string>(target);
  const [run, setRun] = useState<Run | null>(null);
  const swapped = useRef(false);
  /** Mirrors `swapped` for rendering: one extra render at the swap, for the scene's background. */
  const [swappedShown, setSwappedShown] = useState(false);

  useEffect(() => {
    if (run) {
      if (run.to !== target && !swapped.current) setRun({ ...run, to: target });
      return;
    }
    if (target === current) return;
    const def = findTransition(transitionId);
    if (def.kind === "cut") {
      setCurrent(target);
      return;
    }
    swapped.current = false;
    setRun({ from: current, to: target, def, startMs: performance.now() });
  }, [target, current, run, transitionId]);

  // Replays the (possibly unsaved) transition onto the current scene. Not on mount.
  const replayed = useRef(replay);
  useEffect(() => {
    if (replay === replayed.current) return;
    replayed.current = replay;
    const def = findTransition(transitionId);
    if (run || def.kind === "cut") return;
    swapped.current = false;
    setRun({ from: null, to: current, def, startMs: performance.now() });
    // Only on a new replay request; the transition id and scene are read as they are then.
  }, [replay]);

  useEffect(() => {
    if (!run) return;
    let raf = 0;
    let lastFrame = -1;
    const finish = () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
      // Hold the last frame until React has rendered the settled scene: the browser can
      // paint before that render, and with the variables cleared (frame 0) it would flash
      // the old scene. The layout effect below clears them after the commit.
      writeFrame(body, transitionFrame(run.def.kind, totalFrames(run.def.kind)));
      setCurrent(run.to);
      setRun(null);
      setSwappedShown(false);
    };
    const tick = (nowMs: number) => {
      const frame = frameAt(run.startMs, nowMs);
      if (frame !== lastFrame) {
        lastFrame = frame;
        const f = transitionFrame(run.def.kind, frame);
        swapped.current = f.swapped;
        setSwappedShown(f.swapped);
        if (f.done) return finish();
        writeFrame(body, f);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Animation frames can stop (hidden page, busy machine): never leave a curtain on air.
    const remainingMs = (totalFrames(run.def.kind) * 1000) / FPS - (performance.now() - run.startMs);
    const fallback = setTimeout(finish, Math.max(0, remainingMs) + 400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
    };
  }, [run]);

  // Once settled (committed, before paint), the variables go: "on" scenes don't read them,
  // and the next transition starts from frame 0.
  useLayoutEffect(() => {
    if (!run) clearFrame(body);
  }, [run, body]);

  const role = (type: SceneType): string | undefined => {
    if (!run) return type === viewScene(current) ? "on" : undefined;
    if (run.from === run.to) return type === viewScene(run.to) ? "on" : undefined;
    // The incoming view first: on a side change its scene's section comes in, and the
    // leaving side goes out in the `sameSceneOut` section.
    if (type === viewScene(run.to)) return `${run.def.kind}-in`;
    if (run.from !== null && type === viewScene(run.from)) return `${run.def.kind}-out`;
    return undefined;
  };
  const sameSceneOut =
    run && run.from !== null && run.from !== run.to && viewScene(run.from) === viewScene(run.to)
      ? { view: run.from, role: `${run.def.kind}-out` }
      : null;
  /** The view a scene's (main) section shows: the incoming one, else the leaving one, else null (not involved). */
  const viewOf = (type: SceneType): string | null => {
    if (!run) return type === viewScene(current) ? current : null;
    if (type === viewScene(run.to)) return run.to;
    if (run.from !== null && type === viewScene(run.from)) return run.from;
    return null;
  };
  /** The view the output stands for right now: the old one until the transition swaps. */
  const shown = run ? (swappedShown || !run.from ? run.to : run.from) : current;
  return { role, viewOf, sameSceneOut, shown, running: run ? { def: run.def, startMs: run.startMs } : null };
}

/** Seeded, so every client draws the same pixels. */
const PIXELS = (() => {
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return Array.from({ length: 18 * 8 }, (_, i) => ({
    left: `${((i % 18) * 100) / 18}%`,
    top: `${Math.floor(i / 18) * 12.5}%`,
    d1: (rand() * 0.9).toFixed(3),
    d2: (0.1 + rand() * 0.9).toFixed(3),
    second: rand() < 0.25,
  }));
})();

/** `n` pieces across (or down) the screen, each wiping with a stagger; `alternate` takes turns with the second colour. */
function Staggered({
  n,
  across,
  stagger,
  alternate = false,
  className,
}: {
  n: number;
  across: boolean;
  stagger: number;
  alternate?: boolean;
  className: string;
}) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        // 1px larger than its share, so no hairline shows between neighbours.
        const size = `calc(${100 / n}% + 1px)`;
        const start = `${(i * 100) / n}%`;
        const box: CSSProperties = across
          ? { left: start, width: size, top: 0, bottom: 0 }
          : { top: start, height: size, left: 0, right: 0 };
        return (
          <div
            key={i}
            className={`tr-staggered ${className} ${alternate && i % 2 ? "tr-c2" : "tr-c1"}`}
            style={{ ...box, "--k": i / (n - 1), "--s": stagger } as CSSProperties}
          />
        );
      })}
    </>
  );
}

function CurtainPieces({ id }: { id: string }) {
  switch (id) {
    case "wipe":
      return (
        <>
          <div className="tr-full tr-hwipe tr-wipe-lead tr-c2" />
          <div className="tr-full tr-hwipe tr-wipe-main tr-c1" />
        </>
      );
    case "staggerWipe":
      return <Staggered n={6} across={false} stagger={0.6} alternate className="tr-hwipe" />;
    case "blinds":
      return <Staggered n={12} across stagger={0.35} className="tr-hwipe" />;
    case "shutter":
      return <Staggered n={8} across={false} stagger={0.5} className="tr-vwipe" />;
    case "doors":
      return (
        <>
          <div className="tr-doors tr-door-left tr-c1" />
          <div className="tr-doors tr-door-right tr-c1" />
        </>
      );
    case "iris":
      return <div className="tr-iris" />;
    case "pixels":
      return (
        <>
          {PIXELS.map((p, i) => (
            <div
              key={i}
              className={`tr-pixel ${p.second ? "tr-c2" : "tr-c1"}`}
              style={{ left: p.left, top: p.top, "--d1": p.d1, "--d2": p.d2 } as CSSProperties}
            />
          ))}
        </>
      );
    default:
      return null;
  }
}

/**
 * The curtain of a cover transition, over every scene: pieces in `c1` and `c2` (see
 * `curtainColors` in shared/transitions.ts), with the team logo in the middle while closed.
 * Rendered once per transition; it moves by the --tr-* variables only.
 */
export const TransitionCurtain = memo(function TransitionCurtain({
  id,
  c1,
  c2,
  logo,
}: {
  id: string;
  c1: string;
  c2: string;
  logo: string | null;
}) {
  const style = { "--c1": c1, "--c2": c2 } as CSSProperties;
  return (
    <div className="tr-cover" data-transition={id} style={style} aria-hidden>
      <CurtainPieces id={id} />
      {logo && <img className="tr-logo" src={logo} alt="" />}
    </div>
  );
});
