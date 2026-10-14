import { useLiveData } from "@shared/react/store";
import { cn, PageBody, PageHeader, PanelBoundary } from "../ui";
import { ActionsPanel } from "./ActionsPanel";
import { ClockPanel } from "./ClockPanel";
import { LineupPanel } from "./LineupPanel";
import { MatchPanel } from "./MatchPanel";
import { PresentationPanel } from "./PresentationPanel";
import { OnAirLabel, PreviewPanel } from "./PreviewPanel";
import { ScenePanel } from "./ScenePanel";
import { ScorePanel } from "./ScorePanel";

/** Live / Paused, from the match clock. */
function ClockStatus() {
  const { match } = useLiveData();
  const running = match.clock.running;
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn("size-2 shrink-0 rounded-full bg-warning", running && "bg-success shadow-[0_0_8px_var(--color-success)]")}
      />
      <span
        className={cn("font-condensed text-[13px] font-bold tracking-[0.1em] text-warning uppercase", running && "text-success")}
      >
        {running ? "Live" : "Paused"} · {match.half === 1 ? "1st half" : "2nd half"}
      </span>
      <div className="mx-2 h-3.5 w-px bg-line-strong" />
      <OnAirLabel program={match.program} />
    </div>
  );
}

/** Live: run the match and switch what's on air. */
export function LivePage({ hidden }: { hidden: boolean }) {
  return (
    <div hidden={hidden}>
      <PageHeader title="Live Control">
        <ClockStatus />
      </PageHeader>
      <PageBody className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-4 max-[1100px]:grid-cols-[minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <PanelBoundary name="Overlay preview">
            <PreviewPanel />
          </PanelBoundary>
          <PanelBoundary name="Score">
            <ScorePanel />
          </PanelBoundary>
          <PanelBoundary name="Timer">
            <ClockPanel />
          </PanelBoundary>
          <PanelBoundary name="Match teams">
            <MatchPanel />
          </PanelBoundary>
          <PanelBoundary name="Lineup">
            <LineupPanel />
          </PanelBoundary>
          <PanelBoundary name="Quick actions">
            <ActionsPanel />
          </PanelBoundary>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <PanelBoundary name="Scenes">
            <ScenePanel />
          </PanelBoundary>
          <PanelBoundary name="Player intro">
            <PresentationPanel active={!hidden} />
          </PanelBoundary>
        </div>
      </PageBody>
    </div>
  );
}
