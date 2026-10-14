import {
  adjustClockMs,
  formatClock,
  parseClockInput,
  pauseClock,
  setClockElapsedMs,
  startOrResumeClock,
} from "@shared/clock";
import { useTicking } from "@shared/react/hooks";
import { useLiveData, useStore } from "@shared/react/store";
import type { ClockState } from "@shared/types";
import { useState, type FormEvent } from "react";
import { Button, cn, ErrorText, Panel, PanelBody, PanelTitle, Row, Spacer } from "../ui";

const ADJUSTMENTS = [
  { label: "-1m", ms: -60_000 },
  { label: "-1s", ms: -1_000 },
  { label: "+1s", ms: 1_000 },
  { label: "+1m", ms: 60_000 },
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
  const { clock } = useLiveData().match;
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
            {clock.running ? "Pause" : "Start"}
          </Button>
          <Button variant="ghost" onClick={() => save(setClockElapsedMs(clock, 0, Date.now()))}>
            Reset
          </Button>
          <Spacer />
          <ClockReadout clock={clock} />
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
