import {
  adjustClockMs,
  computeElapsedMs,
  formatClock,
  halfStartClock,
  parseClockInput,
  pauseClock,
  setClockElapsedMs,
  startOrResumeClock,
} from "@shared/clock";
import { takeScene } from "@shared/program";
import { useTicking } from "@shared/react/hooks";
import { useLiveData, useStore } from "@shared/react/store";
import type { ClockState, Half } from "@shared/types";
import { useState, type FormEvent } from "react";
import { Button, cn, ErrorText, Panel, PanelBody, PanelTitle, Row, Spacer } from "../ui";

const ADJUSTMENTS = [
  { label: "-1m", ms: -60_000 },
  { label: "-1s", ms: -1_000 },
  { label: "+1s", ms: 1_000 },
  { label: "+1m", ms: 60_000 },
];

const HALVES: { half: Half; label: string }[] = [
  { half: 1, label: "1st half" },
  { half: 2, label: "2nd half" },
];

function ClockReadout({ clock }: { clock: ClockState }) {
  const text = useTicking((now) => formatClock(clock, now));
  return (
    <div className="min-w-[120px] text-right font-condensed text-[42px] font-semibold tracking-[0.04em] text-white tabular-nums">
      {text}
    </div>
  );
}

export function ClockPanel() {
  const store = useStore();
  const { match, scenes } = useLiveData();
  const { clock, half } = match;
  const [invalid, setInvalid] = useState(false);

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

  /** Stops the clock and puts half time (1st half) or full time (2nd half) on air. */
  const endHalf = () => {
    const now = Date.now();
    const scene = half === 1 ? "halftime" : "fulltime";
    void store.match.endHalf(pauseClock(clock, now), takeScene(scene, scenes[scene].durationMs, now));
  };

  /** Switches half with the clock stopped at its start (00:00 or 45:00). */
  const startHalf = (next: Half) => {
    const target = halfStartClock(next);
    const moves = clock.running || computeElapsedMs(clock, Date.now()) !== target.accumulatedMs;
    if (moves && !confirm(`Switch to the ${next === 1 ? "1st" : "2nd"} half? The clock stops at ${formatClock(target, 0)}.`))
      return;
    void store.match.startHalf(next, target);
  };

  return (
    <Panel>
      <PanelTitle>Timer Control</PanelTitle>
      <PanelBody>
        <Row>
          <Button
            variant="start"
            className={cn(clock.running && "bg-warning")}
            onClick={() => save(clock.running ? pauseClock(clock, Date.now()) : startOrResumeClock(clock, Date.now()))}
          >
            {clock.running ? "❚❚ Pause" : "▶ Start"}
          </Button>
          <Button variant="end" onClick={endHalf}>
            ■ {half === 1 ? "End half" : "End match"}
          </Button>
          <Button variant="ghost" onClick={() => save(setClockElapsedMs(clock, 0, Date.now()))}>
            Reset
          </Button>
          <Spacer />
          <ClockReadout clock={clock} />
        </Row>
        <Row className="flex-nowrap gap-2">
          <span className="shrink-0 text-xs font-medium tracking-[0.04em] text-dim">Half:</span>
          {HALVES.map((h) => (
            <Button
              key={h.half}
              variant="tab"
              aria-pressed={half === h.half}
              className={cn("h-9 flex-1 bg-control text-[13px]", half === h.half && "border-accent bg-accent text-white")}
              onClick={() => startHalf(h.half)}
            >
              {h.label}
            </Button>
          ))}
        </Row>
        <Row>
          {ADJUSTMENTS.map(({ label, ms }) => (
            <Button key={label} variant="ghost" onClick={() => save(adjustClockMs(clock, ms, Date.now()))}>
              {label}
            </Button>
          ))}
          <Spacer />
          <form onSubmit={onSetTime} className="flex flex-wrap items-center gap-2">
            <input name="time" type="text" placeholder="mm:ss" aria-label="Set time (mm:ss)" className="w-[110px]" />
            <Button type="submit" variant="ghost">
              Set time
            </Button>
          </form>
        </Row>
        {invalid && <ErrorText>Use mm:ss, e.g. 45:00</ErrorText>}
      </PanelBody>
    </Panel>
  );
}
