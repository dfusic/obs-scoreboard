import { useLiveData, useStore } from "@shared/react/store";
import { SIDES } from "@shared/types";
import type { ReactNode } from "react";
import { useGraphicsDraft } from "../graphics/draftContext";
import { setOutputFullscreen, useOutputWindow } from "../outputWindow";
import { Button, cn, Hint, PageBody, PageHeader, Panel, PanelBody, PanelBoundary, PanelTitle } from "../ui";
import { LineupEditor, SideTabs, useLineupSide } from "./LineupEditor";
import { TeamPicker } from "./TeamPicker";

/** Match setup: teams, lineups and the kick-off check before the game. Changes show on air at once. */
export function MatchSetupPage({ hidden }: { hidden: boolean }) {
  return (
    <div hidden={hidden}>
      <PageHeader title="Match setup" sub="Teams and lineups for this match. Changes here show on air at once.">
        <a
          href="#/live"
          className="inline-flex h-10 items-center rounded-sm bg-accent px-[18px] font-condensed text-[13px] font-bold tracking-[0.08em] text-white uppercase no-underline hover:opacity-90"
        >
          Go to Live →
        </a>
      </PageHeader>
      <PageBody className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-4 max-[1100px]:grid-cols-[minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <PanelBoundary name="Teams">
            <TeamsPanel />
          </PanelBoundary>
          <PanelBoundary name="Lineup">
            <LineupPanel />
          </PanelBoundary>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <PanelBoundary name="Kick-off check">
            <KickoffCheck />
          </PanelBoundary>
          <PanelBoundary name="Reset">
            <ResetPanel />
          </PanelBoundary>
        </div>
      </PageBody>
    </div>
  );
}

function TeamsPanel() {
  const store = useStore();
  const { match } = useLiveData();
  return (
    <Panel>
      <PanelTitle>1 · Teams</PanelTitle>
      <PanelBody>
        <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
          {SIDES.map((side) => (
            <TeamPicker key={side} side={side} />
          ))}
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-soft">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={match.awayPlayers}
            onChange={(e) => void store.match.setAwayPlayers(e.target.checked)}
          />
          <span>
            Away players &amp; photos available
            <span className="block text-xs text-dim">
              Off: only the home team has a lineup, player intro and player cards; away goals are counted without a
              scorer. Turn on when the away squad has photos.
            </span>
          </span>
        </label>
      </PanelBody>
    </Panel>
  );
}

function LineupPanel() {
  const [side, setSide, sides] = useLineupSide();
  return (
    <Panel>
      <PanelTitle>
        2 · Lineup
        <span className="ml-auto">
          <SideTabs side={side} onChange={setSide} sides={sides} />
        </span>
      </PanelTitle>
      <PanelBody>
        <Hint>
          Who plays, in the order the player intro shows them. The lineup, goal scorer and player card use this list
          too; with nobody picked they use the whole squad.
        </Hint>
        <LineupEditor key={side} side={side} />
      </PanelBody>
    </Panel>
  );
}

function CheckItem({ ok, label, detail, children }: { ok: boolean; label: string; detail?: ReactNode; children?: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden="true"
        className={cn(
          "mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black",
          ok ? "bg-success text-black" : "bg-warning text-black",
        )}
      >
        {ok ? "✓" : "!"}
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn("text-[13px]", ok ? "text-soft" : "text-fg")}>
          <span className="sr-only">{ok ? "Done: " : "To do: "}</span>
          {label}
        </div>
        {!ok && detail && <div className="text-xs text-dim">{detail}</div>}
      </div>
      {!ok && children}
    </li>
  );
}

/** What should be ready before kick-off. Read-only, apart from the output's Fullscreen fix. */
function KickoffCheck() {
  const data = useLiveData();
  const { output, screenLabel } = useOutputWindow();
  const graphics = useGraphicsDraft();
  const { match } = data;
  return (
    <Panel>
      <PanelTitle>Kick-off check</PanelTitle>
      <PanelBody>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          <CheckItem
            ok={!!output}
            label={output && screenLabel ? `Output window open on ${screenLabel}` : "Output window open"}
            detail="Open it from Output at the bottom of the sidebar."
          />
          <CheckItem
            ok={!!output?.fullscreen}
            label="Output fullscreen"
            detail={output ? "The output window isn't fullscreen yet." : "Open the output window first."}
          >
            {output && (
              <Button variant="small" onClick={() => setOutputFullscreen(output, true)}>
                Fullscreen
              </Button>
            )}
          </CheckItem>
          <CheckItem ok={!!match.teams.home} label="Home team set" detail="Pick it under 1 · Teams." />
          <CheckItem ok={!!match.teams.away} label="Away team set" detail="Pick it under 1 · Teams." />
          <CheckItem
            ok={data.lineups.home.length > 0}
            label="Home lineup picked"
            detail="Without one, the intro and pickers use the whole squad."
          />
          <CheckItem
            ok={!graphics.pending && !graphics.unsaved}
            label={graphics.pending || graphics.unsaved ? "Graphics changes not on air" : "No unsaved graphics changes"}
            detail={
              graphics.unsaved
                ? `Unsaved: ${graphics.unsavedSummary}. Save or put them on air, or discard them.`
                : `Saved, not on air: ${graphics.summary}. Put them on air or revert.`
            }
          >
            <a
              href="#/graphics"
              className="inline-flex h-7 items-center rounded-sm border border-line-strong bg-control px-3 text-[11px] text-soft no-underline"
            >
              Graphics →
            </a>
          </CheckItem>
        </ul>
      </PanelBody>
    </Panel>
  );
}

function ResetPanel() {
  const store = useStore();
  const { match } = useLiveData();
  return (
    <Panel>
      <PanelTitle>Reset</PanelTitle>
      <PanelBody>
        <Hint>
          For a new match or a restart. Reset score clears goals only. Full reset also stops the clock at 00:00, goes
          back to the 1st half and puts the scoreboard on air. Teams and lineups stay.
        </Hint>
        <Button
          variant="wide"
          onClick={() => confirm("Reset both scores and clear the goal list?") && void store.match.resetScores()}
        >
          Reset score &amp; goals
        </Button>
        <Button
          variant="danger"
          className="w-full"
          onClick={() =>
            confirm(
              "Full reset? This clears the score, goals and clock, goes back to the 1st half and returns to the scoreboard. Teams and lineups stay.",
            ) && void store.match.reset(match)
          }
        >
          Full reset
        </Button>
      </PanelBody>
    </Panel>
  );
}
