import { computeElapsedMs } from "@shared/clock";
import { matchPlayers, sidesWithPlayers } from "@shared/liveFeed";
import { goalMinute } from "@shared/program";
import { useLiveData, useStore } from "@shared/react/store";
import { SIDES, type GoalEvent, type Player, type Side } from "@shared/types";
import { useRef, useState } from "react";
import { Button, cn, Hint, ON_AIR, Panel, Popover, Spacer, Thumb } from "../ui";

export function ScorePanel() {
  return (
    <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
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
  // Which button the "Who scored?" popover hangs from, or null when closed.
  const [picker, setPicker] = useState<"add" | "set" | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const setRef = useRef<HTMLButtonElement>(null);
  const label = side === "home" ? "Home" : "Away";
  const team = data.teams[side];
  const hasPlayers = sidesWithPlayers(data.match).includes(side);
  const lastGoal = [...data.match.goals].reverse().find((g) => g.side === side);
  const lastScorer = lastGoal?.playerId ? data.players.get(lastGoal.playerId) : undefined;

  const addGoal = () => {
    void store.match.recordGoal({ side, playerId: null, elapsedMs: computeElapsedMs(data.match.clock, Date.now()) });
    setPicker(hasPlayers ? "add" : null);
  };

  const pickScorer = (playerId: string | null) => {
    void store.match.setGoalScorer(data.match, side, playerId);
    setPicker(null);
  };

  return (
    <Panel className="relative flex flex-col gap-2.5 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center text-faint">
          {team && <Thumb url={team.logo} iconSize={16} className="max-h-8 max-w-8 object-contain" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-condensed text-[15px] leading-tight font-bold tracking-[0.04em] text-white uppercase">
            {team?.name ?? `No ${side} team`}
          </div>
          <div className="text-[11px] tracking-[0.04em] text-dim">{label}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="score"
          className="bg-transparent text-dim"
          aria-label={`Remove ${label} goal`}
          title="Undo the last goal"
          onClick={() => {
            void store.match.removeLastGoal(data.match, side);
            setPicker(null);
          }}
        >
          &minus;
        </Button>
        <span className="min-w-[60px] text-center font-condensed text-5xl leading-none font-black text-white tabular-nums">
          {data.match.score[side]}
        </span>
        <Button ref={addRef} variant="score" aria-label={`Add ${label} goal`} onClick={addGoal}>
          +
        </Button>
      </div>

      <div className="flex min-h-7 items-center gap-2">
        {lastGoal ? (
          <span className="min-w-0 truncate text-xs text-soft">
            Last goal {goalMinute(lastGoal.elapsedMs)}'
            {hasPlayers && <> · {lastScorer?.name ?? "scorer unknown"}</>}
          </span>
        ) : (
          <span className="text-xs text-dim">No goals yet</span>
        )}
        <Spacer />
        {lastGoal && hasPlayers && (
          <Button
            ref={setRef}
            variant="small"
            aria-haspopup="dialog"
            aria-expanded={picker === "set"}
            onClick={() => setPicker(picker ? null : "set")}
          >
            {lastScorer ? "Change scorer" : "Set scorer"}
          </Button>
        )}
      </div>

      {lastGoal && hasPlayers && (
        <ScorerPicker
          open={picker !== null}
          goal={lastGoal}
          players={matchPlayers(data, side)}
          anchorRef={picker === "set" ? setRef : addRef}
          onPick={pickScorer}
          onClose={() => setPicker(null)}
        />
      )}
    </Panel>
  );
}

/** "Who scored?" for the side's latest goal, opened from + or Set / Change scorer. */
function ScorerPicker({
  open,
  goal,
  players,
  anchorRef,
  onPick,
  onClose,
}: {
  open: boolean;
  goal: GoalEvent;
  players: Player[];
  anchorRef: { current: HTMLElement | null };
  onPick: (playerId: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? players.filter((p) => p.name.toLowerCase().includes(q)) : players;
  const close = () => {
    setQuery("");
    onClose();
  };
  const pick = (playerId: string | null) => {
    setQuery("");
    onPick(playerId);
  };

  return (
    <Popover
      open={open}
      onClose={close}
      ignore={anchorRef}
      label="Who scored?"
      // Opens upwards: the score sits at the bottom of the Live page.
      className="right-0 bottom-full left-0 mb-1.5 max-h-[min(420px,70vh)]"
    >
      <div className="font-condensed text-xs font-bold tracking-[0.1em] text-soft uppercase">
        Who scored? ({goalMinute(goal.elapsedMs)}')
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && shown.length === 1) pick(shown[0].id);
        }}
        placeholder="Search players"
        aria-label="Search players"
      />
      <div className="grid min-h-0 grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-1.5 overflow-y-auto">
        {shown.length ? (
          shown.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              className={cn(
                "flex h-9 items-center gap-2 overflow-hidden border border-line-strong bg-control px-2.5 text-left font-sans text-[13px] font-medium tracking-normal whitespace-nowrap normal-case text-fg",
                p.id === goal.playerId && ON_AIR,
              )}
            >
              <span className="truncate">{p.name}</span>
            </button>
          ))
        ) : (
          <Hint className="col-span-full">
            {players.length ? "No player matches." : "No players. Add them on the Teams page, then pick the lineup."}
          </Hint>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => pick(null)}>
          Unknown scorer
        </Button>
        <Spacer />
        <Button variant="ghost" onClick={close}>
          Later
        </Button>
      </div>
    </Popover>
  );
}
