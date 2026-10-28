import { OutputPreview } from "../OutputPreview";
import { Panel, PanelTitle } from "../ui";

/** The real output page, scaled: always what's on air. */
export function PreviewPanel() {
  return (
    <Panel className="overflow-hidden bg-well">
      <PanelTitle className="py-2">Output · on air</PanelTitle>
      <OutputPreview className="rounded-none" />
    </Panel>
  );
}
