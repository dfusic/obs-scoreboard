import { PanelBoundary } from "../ui";
import { ActionsPanel } from "./ActionsPanel";
import { ClockPanel } from "./ClockPanel";
import { LineupPanel } from "./LineupPanel";
import { MatchPanel } from "./MatchPanel";
import { PresentationPanel } from "./PresentationPanel";
import { PreviewPanel } from "./PreviewPanel";
import { ScenePanel } from "./ScenePanel";
import { ScorePanel } from "./ScorePanel";

/** Live: run the match and switch what's on air. */
export function LivePage({ hidden }: { hidden: boolean }) {
  return (
    <div hidden={hidden} className="grid grid-cols-[minmax(0,1fr)_300px] gap-4 max-[820px]:grid-cols-[minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <PanelBoundary name="Output">
          <PreviewPanel />
        </PanelBoundary>
        <PanelBoundary name="Score">
          <ScorePanel />
        </PanelBoundary>
        <PanelBoundary name="Timer">
          <ClockPanel />
        </PanelBoundary>
        <PanelBoundary name="Lineup">
          <LineupPanel />
        </PanelBoundary>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <PanelBoundary name="Match">
          <MatchPanel />
        </PanelBoundary>
        <PanelBoundary name="Player intro">
          <PresentationPanel active={!hidden} />
        </PanelBoundary>
        <PanelBoundary name="Scenes">
          <ScenePanel />
        </PanelBoundary>
        <PanelBoundary name="Quick actions">
          <ActionsPanel />
        </PanelBoundary>
      </div>
    </div>
  );
}
