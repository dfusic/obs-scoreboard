import { SCENE_LABELS, type ProgramState } from "@shared/types";
import { OutputPreview } from "../OutputPreview";
import { Panel, PanelTitle } from "../ui";

export function OnAirLabel({ program }: { program: ProgramState }) {
  return (
    <span className="font-condensed text-[13px] tracking-[0.06em] text-dim uppercase">
      On air: <strong className="text-danger">{SCENE_LABELS[program.scene]}</strong>
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
