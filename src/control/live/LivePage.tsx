import { useLiveData } from "@shared/react/store";
import type { ReactNode } from "react";
import { Hint, PageBody, Panel, PanelBoundary } from "../ui";
import { LineupRow } from "./LineupRow";
import { OnAirStrip } from "./OnAirStrip";
import { PresentationPanel } from "./PresentationPanel";
import { PreviewPanel } from "./PreviewPanel";
import { ScenePanel } from "./ScenePanel";
import { ScorePanel } from "./ScorePanel";

/** Shown until the match has a home team: teams and lineups are set up on Match setup. */
function SetupPrompt() {
  const { match } = useLiveData();
  if (match.teams.home) return null;
  return (
    <Panel className="flex flex-wrap items-center gap-3 border-warning px-4 py-3">
      <Hint className="flex-1 text-[13px] text-soft">No home team for this match yet. Pick the teams and lineup first.</Hint>
      <a
        href="#/match"
        className="inline-flex h-9 items-center rounded-sm bg-accent px-4 font-condensed text-[13px] font-bold tracking-[0.08em] text-white uppercase no-underline hover:opacity-90"
      >
        Match setup →
      </a>
    </Panel>
  );
}

/**
 * Live: run the match and switch what's on air (scenes, score, clock). Pre-match setup
 * (teams, lineups, resets) is on Match setup. `stripRight` fills the strip's notice slot.
 */
export function LivePage({ hidden, stripRight }: { hidden: boolean; stripRight?: ReactNode }) {
  return (
    <div hidden={hidden}>
      <PanelBoundary name="On air">
        <OnAirStrip right={stripRight} />
      </PanelBoundary>
      <PageBody className="grid grid-cols-[minmax(0,1fr)_minmax(300px,380px)] items-start gap-4 py-4 max-[1000px]:grid-cols-[minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <SetupPrompt />
          <PanelBoundary name="Output preview">
            <PreviewPanel active={!hidden} />
          </PanelBoundary>
          <PanelBoundary name="Score">
            <ScorePanel />
          </PanelBoundary>
        </div>
        {/* Scenes first in one column (GOAL! without scrolling). The intro stepper is always
            there at the same height, so nothing moves under the cursor on a take. */}
        <div className="flex min-w-0 flex-col gap-3 max-[1000px]:order-first">
          <PanelBoundary name="Scenes">
            <ScenePanel />
          </PanelBoundary>
          <PanelBoundary name="Player intro">
            <PresentationPanel active={!hidden} />
          </PanelBoundary>
          <PanelBoundary name="Lineup">
            <LineupRow hidden={hidden} />
          </PanelBoundary>
        </div>
      </PageBody>
    </div>
  );
}
