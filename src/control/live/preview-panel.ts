import { activeScene, remainingMs } from "@shared/program";
import { SCENE_LABELS, type ProgramState } from "@shared/types";
import { createOutputPreview } from "../preview";

let latestProgram: ProgramState | null = null;

/** "Goal scorer · 12s" while a timed scene is on air. */
export function onAirLabel(program: ProgramState, nowMs: number): string {
  const scene = activeScene(program, nowMs);
  const left = scene === program.scene ? remainingMs(program, nowMs) : null;
  return left ? `${SCENE_LABELS[scene]} · ${Math.ceil(left / 1000)}s` : SCENE_LABELS[scene];
}

export function initPreviewPanel(root: HTMLElement): void {
  root.innerHTML = `
    <div class="panel-title row">
      Output
      <div class="spacer"></div>
      <span class="on-air">On air: <strong id="on-air-label">—</strong></span>
    </div>
    <div class="preview-body"><div id="output-frame"></div></div>
  `;
  createOutputPreview(root.querySelector("#output-frame")!);

  const label = root.querySelector("#on-air-label")!;
  setInterval(() => {
    if (latestProgram) label.textContent = onAirLabel(latestProgram, Date.now());
  }, 250);
}

export function updatePreviewPanel(program: ProgramState): void {
  latestProgram = program;
}
