import { computeElapsedMs } from "@shared/clock";
import { matchPlayers, sidesWithPlayers } from "@shared/liveFeed";
import { goalMinute } from "@shared/program";
import { useLiveData, useStore } from "@shared/react/store";
import { SIDES, type Side } from "@shared/types";
import { useState } from "react";
import { Button, cn, Hint, ON_AIR, Panel, PanelBody, PanelTitle, Row, Spacer } from "../ui";

export function ScorePanel() {
  return (
    <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
      {SIDES.map((side) => (
        <SideScore key={side} side={side} />
      ))}
    </div>
  );
}

/**
 * Score and scorers only: nothing here changes what's on air. During a goal the goal
 * scene is taken from the Scenes panel, and this is updated behind it: + adds the goal
 * (the scene's score follows live) and asks who scored, which can also be answered or
 * corrected later, once the announcer names the scorer.
 */
function SideScore({ side }: { side: Side }) {
  const store = useStore();
  const data = useLiveData();
  const [pickerOpen, setPickerOpen] = useState(false);
  const label = side === "home" ? "Home" : "Away";
  const squad = matchPlayers(data, side);
  const hasPlayers = sidesWithPlayers(data.match).includes(side);
  const lastGoal = [...data.match.goals].reverse().find((g) => g.side === side);
  const lastScorer = lastGoal?.playerId ? data.players.get(lastGoal.playerId) : undefined;

  const addGoal = () => {
    void store.match.recordGoal({ side, playerId: null, elapsedMs: computeElapsedMs(data.match.clock, Date.now()) });
    setPickerOpen(hasPlayers);
  };

  const pickScorer = (playerId: string | null) => {
    void store.match.setGoalScorer(data.match, side, playerId);
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
            onClick={() => {
              void store.match.removeLastGoal(data.match, side);
              setPickerOpen(false);
            }}
          >
            &minus;
          </Button>
          <span className="min-w-[60px] text-center font-condensed text-5xl font-black text-white tabular-nums">
            {data.match.score[side]}
          </span>
          <Button variant="score" aria-label={`Add ${label} goal`} onClick={addGoal}>
            +
          </Button>
        </Row>

        {lastGoal && hasPlayers && (
          <Row className="flex-nowrap">
            <span className="min-w-0 truncate text-[13px] text-soft">
              Last goal {goalMinute(lastGoal.elapsedMs)}' · {lastScorer?.name ?? "scorer unknown"}
            </span>
            <Spacer />
            <Button variant="ghost" onClick={() => setPickerOpen(!pickerOpen)}>
              {lastScorer ? "Change scorer" : "Set scorer"}
            </Button>
          </Row>
        )}

        {pickerOpen && lastGoal && (
          <div className="flex flex-col gap-2.5 rounded-sm border border-line-strong bg-well p-3">
            <div className="font-condensed text-xs font-bold tracking-[0.1em] text-soft uppercase">
              Who scored? ({goalMinute(lastGoal.elapsedMs)}')
            </div>
            <div className="grid max-h-[260px] grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-1.5 overflow-y-auto">
              {squad.length ? (
                squad.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickScorer(p.id)}
                    className={cn(
                      "flex h-9 items-center gap-2 overflow-hidden border border-line-strong bg-control px-2.5 text-left text-[13px] whitespace-nowrap text-fg",
                      p.id === lastGoal.playerId && ON_AIR,
                    )}
                  >
                    {p.name}
                  </button>
                ))
              ) : (
                <Hint>No players. Add them on the Teams page, then pick the lineup.</Hint>
              )}
            </div>
            <Row>
              <Button variant="ghost" onClick={() => pickScorer(null)}>
                Unknown scorer
              </Button>
              <Spacer />
              <Button variant="ghost" onClick={() => setPickerOpen(false)}>
                Later
              </Button>
            </Row>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
