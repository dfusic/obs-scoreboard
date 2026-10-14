import { activeScene, remainingMs } from "@shared/program";
import { useTicking } from "@shared/react/hooks";
import { useLiveData } from "@shared/react/store";
import { SCENE_LABELS, type ProgramState } from "@shared/types";
import { OutputPreview } from "../OutputPreview";
import { Panel, PanelTitle, Spacer } from "../ui";

/** "Goal scorer · 12s" while a timed scene is on air. */
export function onAirLabel(program: ProgramState, nowMs: number): string {
  const scene = activeScene(program, nowMs);
  const left = scene === program.scene ? remainingMs(program, nowMs) : null;
  return left ? `${SCENE_LABELS[scene]} · ${Math.ceil(left / 1000)}s` : SCENE_LABELS[scene];
}

function OnAirLabel({ program }: { program: ProgramState }) {
  const label = useTicking((now) => onAirLabel(program, now));
  return (
    <span className="text-xs tracking-[0.04em] normal-case">
      On air: <strong className="text-danger">{label}</strong>
    </span>
  );
}

export function PreviewPanel() {
  const { program } = useLiveData().match;
  return (
    <Panel>
      <PanelTitle>
        Output
        <Spacer />
        <OnAirLabel program={program} />
      </PanelTitle>
      <div className="p-3">
        <OutputPreview />
      </div>
    </Panel>
  );
}
