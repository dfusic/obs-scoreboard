import {
  adjustClockMs,
  formatClock,
  parseClockInput,
  pauseClock,
  setClockElapsedMs,
  startOrResumeClock,
} from "@shared/clock";
import { updateClock } from "@shared/matchRepo";
import type { ClockState } from "@shared/types";

let latestClock: ClockState | null = null;

export function initClockPanel(root: HTMLElement): void {
  root.innerHTML = `
    <div class="panel-title">Timer Control</div>
    <div class="panel-body">
      <div class="row">
        <button id="start-pause-btn" type="button" class="btn-start">Start</button>
        <button id="clock-zero-btn" type="button" class="btn-ghost">Reset</button>
        <div class="spacer"></div>
        <div id="clock-readout" class="clock-readout">00:00</div>
      </div>
      <div class="row">
        <button data-adjust="-60000" type="button" class="btn-ghost">-1m</button>
        <button data-adjust="-1000" type="button" class="btn-ghost">-1s</button>
        <button data-adjust="1000" type="button" class="btn-ghost">+1s</button>
        <button data-adjust="60000" type="button" class="btn-ghost">+1m</button>
        <div class="spacer"></div>
        <form id="clock-set-form" class="row" style="gap: 8px;">
          <input id="clock-set-input" type="text" placeholder="mm:ss" aria-label="Set time (mm:ss)" />
          <button type="submit" class="btn-ghost">Set time</button>
        </form>
      </div>
      <span id="clock-set-error" class="error-text" hidden>Use mm:ss, e.g. 45:00</span>
    </div>
  `;

  const setInput = root.querySelector("#clock-set-input") as HTMLInputElement;
  const setError = root.querySelector("#clock-set-error") as HTMLElement;

  root.querySelector("#start-pause-btn")!.addEventListener("click", () => {
    if (!latestClock) return;
    const now = Date.now();
    void updateClock(latestClock.running ? pauseClock(latestClock, now) : startOrResumeClock(latestClock, now));
  });

  root.querySelector("#clock-zero-btn")!.addEventListener("click", () => {
    if (!latestClock) return;
    void updateClock(setClockElapsedMs(latestClock, 0, Date.now()));
  });

  for (const btn of root.querySelectorAll<HTMLButtonElement>("[data-adjust]")) {
    btn.addEventListener("click", () => {
      if (!latestClock) return;
      void updateClock(adjustClockMs(latestClock, Number(btn.dataset.adjust), Date.now()));
    });
  }

  root.querySelector("#clock-set-form")!.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!latestClock) return;
    const ms = parseClockInput(setInput.value);
    setError.hidden = ms !== null;
    if (ms === null) return;
    void updateClock(setClockElapsedMs(latestClock, ms, Date.now()));
    setInput.value = "";
  });

  setInterval(() => {
    if (latestClock) {
      root.querySelector("#clock-readout")!.textContent = formatClock(latestClock, Date.now());
    }
  }, 250);
}

export function updateClockPanel(root: HTMLElement, clock: ClockState): void {
  latestClock = clock;
  const btn = root.querySelector("#start-pause-btn") as HTMLButtonElement;
  btn.textContent = clock.running ? "Pause" : "Start";
  btn.classList.toggle("running", clock.running);
}
