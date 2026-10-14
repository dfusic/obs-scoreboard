import { computeElapsedMs } from "@shared/clock";
import { matchPlayers, sidesWithPlayers } from "@shared/liveFeed";
import { takeScene } from "@shared/program";
import { useLiveData, useStore } from "@shared/react/store";
import { SIDES, type GoalEvent, type Side } from "@shared/types";
import { useState } from "react";
import { Button, Hint, Panel, PanelBody, PanelTitle, Row, Spacer } from "../ui";

export function ScorePanel() {
  return (
    <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
      {SIDES.map((side) => (
        <SideScore key={side} side={side} />
      ))}
    </div>
  );
}

function SideScore({ side }: { side: Side }) {
  const store = useStore();
  const data = useLiveData();
  const [pickerOpen, setPickerOpen] = useState(false);
  const label = side === "home" ? "Home" : "Away";
  const squad = matchPlayers(data, side);

  const goal = (playerId: string | null): GoalEvent => ({
    side,
    playerId,
    elapsedMs: computeElapsedMs(data.match.clock, Date.now()),
  });

  /** Adds the goal and puts the goal-scorer scene on air. */
  const scoreGoal = (playerId: string | null) => {
    const program = takeScene("goal", data.scenes.goal.durationMs, Date.now(), { side, playerId });
    void store.match.recordGoal(goal(playerId), program);
    setPickerOpen(false);
  };

  return (
    <Panel>
      <PanelTitle>{data.teams[side]?.name ?? label} — Score</PanelTitle>
      <PanelBody>
        <Row className="flex-nowrap justify-between">
          <Button
            variant="score"
            className="bg-transparent text-dim"
            aria-label={`Remove ${label} goal`}
            onClick={() => void store.match.removeLastGoal(data.match, side)}
          >
            &minus;
          </Button>
          <span className="min-w-[60px] text-center font-condensed text-5xl font-black text-white tabular-nums">
            {data.match.score[side]}
          </span>
          <Button
            variant="score"
            aria-label={`Add ${label} goal without a scorer`}
            onClick={() => void store.match.recordGoal(goal(null), null)}
          >
            +
          </Button>
        </Row>
        <Button
          variant="goal"
          onClick={() => {
            // Without player data for this side there is nobody to pick: go straight on air.
            if (!sidesWithPlayers(data.match).includes(side)) scoreGoal(null);
            else setPickerOpen(!pickerOpen);
          }}
        >
          Goal!
        </Button>

        {pickerOpen && (
          <div className="flex flex-col gap-2.5 rounded-sm border border-line-strong bg-well p-3">
            <div className="font-condensed text-xs font-bold tracking-[0.1em] text-soft uppercase">Who scored?</div>
            <div className="grid max-h-[260px] grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-1.5 overflow-y-auto">
              {squad.length ? (
                squad.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => scoreGoal(p.id)}
                    className="flex h-9 items-center gap-2 overflow-hidden border border-line-strong bg-control px-2.5 text-left text-[13px] whitespace-nowrap text-fg"
                  >
                    {p.name}
                  </button>
                ))
              ) : (
                <Hint>No players. Add them on the Teams page, then pick the lineup.</Hint>
              )}
            </div>
            <Row>
              <Button variant="ghost" onClick={() => scoreGoal(null)}>
                Unknown scorer
              </Button>
              <Spacer />
              <Button variant="ghost" onClick={() => setPickerOpen(false)}>
                Cancel
              </Button>
            </Row>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
