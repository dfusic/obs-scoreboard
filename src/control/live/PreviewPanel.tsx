import { useLiveData } from "@shared/react/store";
import { ScenePreview } from "../ScenePreview";
import { Panel, PanelTitle } from "../ui";

/** The output's scenes, scaled: always what's on air. `active: false` (Live page hidden) drops the preview's iframe. */
export function PreviewPanel({ active }: { active: boolean }) {
  const data = useLiveData();
  return (
    <Panel className="overflow-hidden bg-well">
      <PanelTitle className="py-2">Output · on air</PanelTitle>
      <ScenePreview className="rounded-none" data={data} scene={null} active={active} />
    </Panel>
  );
}
