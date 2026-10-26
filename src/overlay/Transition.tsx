import {
  FPS,
  frameAt,
  totalFrames,
  transition as findTransition,
  transitionFrame,
  type Transition,
  type TransitionFrame,
} from "@shared/transitions";
import type { SceneType, SchemeColors } from "@shared/types";
import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

interface Run {
  /** The scene leaving; null when replaying the transition onto the current scene. */
  from: SceneType | null;
  to: SceneType;
  def: Transition;
  /** performance.now() when it started. */
  startMs: number;
}

const VARS = ["--tr-out", "--tr-in", "--tr-in-linear", "--tr-a", "--tr-b", "--tr-logo", "--tr-swap"] as const;

function writeFrame(f: TransitionFrame) {
  const values = [f.out, f.in, f.inLinear, f.cover, f.reveal, f.logo, f.swapped ? 1 : 0];
  VARS.forEach((name, i) => document.body.style.setProperty(name, String(values[i])));
}

function clearFrame() {
  for (const name of VARS) document.body.style.removeProperty(name);
}

/**
 * Moves the output from scene to scene with the chosen transition (shared/transitions.ts).
 * React renders once when a transition starts and once when it ends; in between, a
 * requestAnimationFrame loop writes the --tr-* variables on body, only when the 30 fps
 * frame changes. Returns each scene's data-tr role (undefined = hidden), the scene
 * shown (switches at the swap, for the background), and the running transition, for
 * the curtain.
 *
 * A new target before a transition swaps scenes replaces its destination; after that,
 * the next transition starts when this one ends. `replay` (a counter) plays the
 * transition onto the current scene, for the Graphics preview.
 */
export function useSceneTransition(target: SceneType, transitionId: string, replay: number) {
  const [current, setCurrent] = useState<SceneType>(target);
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
      writeFrame(transitionFrame(run.def.kind, totalFrames(run.def.kind)));
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
        writeFrame(f);
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
    if (!run) clearFrame();
  }, [run]);

  const role = (type: SceneType): string | undefined => {
    if (!run) return type === current ? "on" : undefined;
    if (run.from === run.to) return type === run.to ? "on" : undefined;
    if (type === run.from) return `${run.def.kind}-out`;
    if (type === run.to) return `${run.def.kind}-in`;
    return undefined;
  };
  /** The scene the output stands for right now: the old one until the transition swaps. */
  const shown = run ? (swappedShown || !run.from ? run.to : run.from) : current;
  return { role, shown, running: run?.def ?? null };
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
 * The curtain of a cover transition, over every scene: pieces in the colour scheme's
 * colours (highlight and background), with the team logo in the middle while closed.
 * Rendered once per transition; it moves by the --tr-* variables only.
 */
export const TransitionCurtain = memo(function TransitionCurtain({
  id,
  colors,
  logo,
}: {
  id: string;
  colors: SchemeColors;
  logo: string | null;
}) {
  const style = { "--c1": colors.highlight, "--c2": colors.background ?? "#0a0c10" } as CSSProperties;
  return (
    <div className="tr-cover" data-transition={id} style={style} aria-hidden>
      <CurtainPieces id={id} />
      {logo && <img className="tr-logo" src={logo} alt="" />}
    </div>
  );
});
