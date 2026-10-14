import { activeScene, remainingMs } from "@shared/program";
import { useTicking } from "@shared/react/hooks";
import { SCENE_LABELS, type ProgramState } from "@shared/types";
import { OutputPreview } from "../OutputPreview";
import { Panel, PanelTitle } from "../ui";

/** "Goal scorer · 12s" while a timed scene is on air. */
export function onAirLabel(program: ProgramState, nowMs: number): string {
  const scene = activeScene(program, nowMs);
  const left = scene === program.scene ? remainingMs(program, nowMs) : null;
  return left ? `${SCENE_LABELS[scene]} · ${Math.ceil(left / 1000)}s` : SCENE_LABELS[scene];
}

export function OnAirLabel({ program }: { program: ProgramState }) {
  const label = useTicking((now) => onAirLabel(program, now));
  return (
    <span className="font-condensed text-[13px] tracking-[0.06em] text-dim uppercase">
      On air: <strong className="text-danger">{label}</strong>
    </span>
  );
}

export function PreviewPanel() {
  return (
    <Panel className="overflow-hidden bg-well">
      <PanelTitle>Overlay preview</PanelTitle>
      <OutputPreview className="rounded-none" />
    </Panel>
  );
}
