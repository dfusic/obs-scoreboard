import {
  adjustClockMs,
  clockStopMs,
  computeElapsedMs,
  formatClock,
  formatMs,
  HALF_START_MS,
  halfStartClock,
  isClockHeld,
  isValidClockStop,
  parseClockInput,
  pauseClock,
  setClockElapsedMs,
  startOrResumeClock,
} from "@shared/clock";
import { useTicking } from "@shared/react/hooks";
import { useLiveData, useStore } from "@shared/react/store";
import { SCENE_LABELS, type ClockState, type ClockStop, type Half, type ProgramState } from "@shared/types";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button, cn, CommitInput, ErrorText, Popover, Spacer } from "../ui";

const ADJUSTMENTS = [
  { label: "−1m", ms: -60_000 },
  { label: "−1s", ms: -1_000 },
  { label: "+1s", ms: 1_000 },
  { label: "+1m", ms: 60_000 },
];

const HALVES: { half: Half; label: string }[] = [
  { half: 1, label: "1st half" },
  { half: 2, label: "2nd half" },
];

/** The scene on air, with its side for per-team scenes. */
function onAirName(program: ProgramState) {
  const label = SCENE_LABELS[program.scene];
  return program.side === "away" && (program.scene === "presentation" || program.scene === "lineup") ? `${label} away` : label;
}

/** Fixed width (long names truncate), so the clock controls next to it never move on a take. */
function OnAirPill({ program }: { program: ProgramState }) {
  const text = `On air: ${onAirName(program)}`;
  return (
    <span
      role="status"
      title={text}
      className="inline-flex h-8 w-[250px] max-w-full shrink-0 items-center gap-2 rounded-full bg-danger px-3.5 font-condensed text-sm font-bold tracking-[0.08em] whitespace-nowrap text-white uppercase"
    >
      <span className="size-2 shrink-0 rounded-full bg-white" aria-hidden="true" />
      <span className="min-w-0 truncate">{text}</span>
    </span>
  );
}

/** The match clock as shown on air (held at the clock stop); the only part of the strip that re-renders every second. */
function ClockReadout({ clock, stopAtMs }: { clock: ClockState; stopAtMs: number | null }) {
  const text = useTicking((now) => formatClock(clock, now, stopAtMs));
  return (
    <span className="min-w-[96px] font-condensed text-[34px] leading-none font-semibold tracking-[0.04em] text-white tabular-nums">
      {text}
    </span>
  );
}

/** Running / Paused, or "Held at 45:00" while running past the clock stop. */
function ClockStatus({ clock, stopAtMs }: { clock: ClockState; stopAtMs: number | null }) {
  const held = useTicking((now) => clock.running && isClockHeld(clock, now, stopAtMs));
  const text = held && stopAtMs !== null ? `Held at ${formatMs(stopAtMs)}` : clock.running ? "Running" : "Paused";
  const tone = held ? "text-accent" : clock.running ? "text-success" : "text-warning";
  const dot = held ? "bg-accent" : clock.running ? "bg-success" : "bg-warning";
  return (
    <span className={cn("flex items-center gap-1.5 font-condensed text-xs font-bold tracking-[0.1em] uppercase", tone)}>
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />
      {text}
    </span>
  );
}

/**
 * The Live page's sticky top bar: what's on air, the clock with its everyday controls, and
 * the rest of the timer under "Clock ⋯". `right` is a slot at the far right for page-wide
 * notices (e.g. graphics changes not on air yet).
 */
export function OnAirStrip({ right }: { right?: ReactNode }) {
  const store = useStore();
  const { match } = useLiveData();
  const { clock, clockStop, half, program } = match;
  const stopAtMs = clockStopMs(clockStop, half);
  const save = (next: ClockState) => void store.match.updateClock(next);

  return (
    <div
      className={cn(
        "sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-page/95 px-6 py-3 backdrop-blur",
        "max-[480px]:px-4",
      )}
    >
      <h1 className="m-0 font-condensed text-2xl leading-tight font-black tracking-[0.04em] text-white uppercase">Live</h1>
      <OnAirPill program={program} />
      <div className="mx-1 h-8 w-px bg-line-strong max-[640px]:hidden" aria-hidden="true" />
      <div className="flex items-center gap-3">
        <ClockReadout clock={clock} stopAtMs={stopAtMs} />
        <div className="flex flex-col leading-tight">
          <span className="font-condensed text-xs font-bold tracking-[0.1em] text-soft uppercase">
            {half === 1 ? "1st half" : "2nd half"}
          </span>
          <ClockStatus clock={clock} stopAtMs={stopAtMs} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="start"
          className={cn("h-10 min-w-[104px] px-4 text-sm", clock.running && "bg-warning")}
          onClick={() => save(clock.running ? pauseClock(clock, Date.now()) : startOrResumeClock(clock, Date.now()))}
        >
          {clock.running ? "❚❚ Pause" : "▶ Start"}
        </Button>
        <Button
          variant="end"
          className="h-10 min-w-[128px] px-4 text-sm"
          title={`Stops the clock. Take ${half === 1 ? "Half time" : "Full time"} from the Scenes panel.`}
          onClick={() => void store.match.endHalf(pauseClock(clock, Date.now()))}
        >
          {half === 1 ? "■ End half" : "■ End match"}
        </Button>
        <ClockMenu clock={clock} half={half} clockStop={clockStop} />
      </div>
      <Spacer />
      {/* Slot for page-wide notices, e.g. "Graphics: N changes not on air". */}
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

/**
 * Where the shown clock stops in the current half (e.g. 45:00): a checkbox and the time,
 * saved on change (blur / Enter). Only the shown time holds; the clock keeps counting, so
 * unticking or raising the stop continues from the real time.
 */
function ClockStopField({ clockStop, half }: { clockStop: ClockStop; half: Half }) {
  const store = useStore();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const key = half === 1 ? "half1Ms" : "half2Ms";
  const halfLabel = half === 1 ? "1st half" : "2nd half";
  const halfStart = formatMs(HALF_START_MS[half]);
  // A stored stop at or before the half's start (saved in the other half's terms) is ignored on air.
  const ignored = clockStop.enabled && !isValidClockStop(clockStop[key], half);

  const commit = (text: string) => {
    const ms = parseClockInput(text);
    if (ms === null) {
      setError("Use mm:ss or minutes, e.g. 45 or 45:00");
      return false;
    }
    if (!isValidClockStop(ms, half)) {
      setError(`The ${halfLabel} starts at ${halfStart}: stop it later.`);
      return false;
    }
    setError(null);
    // Show what was saved ("45" → "45:00"); the field keeps focus after Enter.
    if (inputRef.current) inputRef.current.value = formatMs(ms);
    if (ms !== clockStop[key]) void store.match.setClockStop({ [key]: ms });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={clockStop.enabled}
            onChange={(e) => void store.match.setClockStop({ enabled: e.target.checked })}
          />
          {halfLabel} stops at
        </label>
        <CommitInput
          ref={inputRef}
          value={formatMs(clockStop[key])}
          onCommit={commit}
          inputMode="numeric"
          placeholder="mm:ss"
          aria-label={`${halfLabel} stop time (mm:ss or minutes)`}
          aria-invalid={error !== null || ignored}
          className={cn("w-[84px] tabular-nums", !clockStop.enabled && "opacity-60")}
        />
      </div>
      {error ? (
        <ErrorText>{error}</ErrorText>
      ) : (
        ignored && <ErrorText>Ignored: the {halfLabel} starts at {halfStart}. Set a later stop.</ErrorText>
      )}
    </>
  );
}

/** Everything else for the timer: halves, nudges, set time, clock stop, reset. */
function ClockMenu({ clock, half, clockStop }: { clock: ClockState; half: Half; clockStop: ClockStop }) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const save = (next: ClockState) => void store.match.updateClock(next);

  const onSetTime = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("time") as HTMLInputElement;
    const ms = parseClockInput(input.value);
    setInvalid(ms === null);
    if (ms === null) return;
    save(setClockElapsedMs(clock, ms, Date.now()));
    input.value = "";
  };

  /** Switches half with the clock stopped at its start (00:00 or 45:00). */
  const startHalf = (next: Half) => {
    const target = halfStartClock(next);
    const moves = clock.running || computeElapsedMs(clock, Date.now()) !== target.accumulatedMs;
    if (moves && !confirm(`Switch to the ${next === 1 ? "1st" : "2nd"} half? The clock stops at ${formatClock(target, 0)}.`))
      return;
    void store.match.startHalf(next, target);
  };

  const heading = "text-[11px] font-medium tracking-[0.04em] text-dim";

  return (
    <div className="relative">
      <Button
        ref={triggerRef}
        variant="ghost"
        className="h-10"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Clock ⋯
      </Button>
      <Popover
        open={open}
        onClose={() => {
          setOpen(false);
          setInvalid(false);
        }}
        ignore={triggerRef}
        label="Clock"
        className="top-full left-0 mt-1.5 w-[300px] max-[480px]:right-0 max-[480px]:left-auto"
      >
        <span className={heading}>Half (stops the clock at its start)</span>
        <div className="grid grid-cols-2 gap-1.5">
          {HALVES.map((h) => (
            <Button
              key={h.half}
              variant="tab"
              aria-pressed={half === h.half}
              className={cn("h-9 bg-control text-[13px]", half === h.half && "border-accent bg-accent text-white")}
              onClick={() => startHalf(h.half)}
            >
              {h.label}
            </Button>
          ))}
        </div>
        <span className={heading}>Adjust</span>
        <div className="grid grid-cols-4 gap-1.5">
          {ADJUSTMENTS.map(({ label, ms }) => (
            <Button
              key={label}
              variant="ghost"
              className="px-0"
              // From the time shown: held at the stop, −1m goes a minute back from the stop.
              onClick={() => save(adjustClockMs(clock, ms, Date.now(), clockStopMs(clockStop, half)))}
            >
              {label}
            </Button>
          ))}
        </div>
        <form onSubmit={onSetTime} className="flex items-center gap-1.5">
          <input name="time" type="text" placeholder="mm:ss" aria-label="Set time (mm:ss)" className="flex-1" />
          <Button type="submit" variant="ghost">
            Set time
          </Button>
        </form>
        {invalid && <ErrorText>Use mm:ss, e.g. 45:00</ErrorText>}
        <span className={heading}>Stop the clock (held on screen, keeps counting)</span>
        <ClockStopField key={half} clockStop={clockStop} half={half} />
        <div className="flex border-t border-line pt-2.5">
          <Button
            variant="ghost"
            className="text-danger"
            onClick={() => confirm("Reset the clock to 00:00?") && save(setClockElapsedMs(clock, 0, Date.now()))}
          >
            Reset clock
          </Button>
        </div>
      </Popover>
    </div>
  );
}
