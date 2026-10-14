import { moveInLineup, toggleInLineup } from "@shared/lineup";
import { useLiveData, useStore } from "@shared/react/store";
import { SIDES, type Player, type Side } from "@shared/types";
import { useState } from "react";
import { Button, cn, Hint, ICON, Panel, PanelBody, PanelTitle, Row, Spacer, Thumb } from "../ui";

export function LineupPanel() {
  const store = useStore();
  const { match } = useLiveData();
  return (
    <Panel>
      <PanelTitle>Lineup</PanelTitle>
      <PanelBody>
        <Hint>
          Before the game, tick who is playing and drag them into presentation order. The intro, lineup, goal scorer and
          player card all use this list.
        </Hint>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-soft">
          <input
            type="checkbox"
            checked={match.awayPlayers}
            onChange={(e) => void store.match.setAwayPlayers(e.target.checked)}
          />
          Away team players &amp; photos available
        </label>
        {SIDES.map((side) =>
          (side === "home" || match.awayPlayers) && match.teams[side] ? <LineupSide key={side} side={side} /> : null,
        )}
      </PanelBody>
    </Panel>
  );
}

function LineupSide({ side }: { side: Side }) {
  const store = useStore();
  const data = useLiveData();
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const lineup = data.lineups[side];
  const squad = data.squads[side];
  const bench = squad.filter((p) => !lineup.includes(p));
  // Current lineup ids, limited to players that still exist.
  const ids = lineup.map((p) => p.id);
  const save = (next: string[]) => void store.match.setLineup(side, next);

  const row = (player: Player, index: number | null) => {
    const ticked = index !== null;
    return (
      <li
        key={player.id}
        draggable={ticked}
        onDragStart={
          ticked
            ? (e) => {
                setDragFrom(index);
                e.dataTransfer.setData("text/plain", player.id);
              }
            : undefined
        }
        onDragOver={ticked && dragFrom !== null ? (e) => e.preventDefault() : undefined}
        onDrop={
          ticked && dragFrom !== null
            ? (e) => {
                e.preventDefault();
                save(moveInLineup(ids, dragFrom, index));
              }
            : undefined
        }
        onDragEnd={() => setDragFrom(null)}
        className={cn(
          "flex min-h-11 items-center gap-2.5 rounded-sm border border-line px-2 py-1 text-dim",
          ticked && "cursor-grab border-line-strong bg-control text-fg",
          ticked && dragFrom === index && "opacity-40",
        )}
      >
        <input
          type="checkbox"
          checked={ticked}
          onChange={() => save(toggleInLineup(ids, player.id))}
          aria-label={`Playing: ${player.name}`}
        />
        {ticked && (
          <>
            <span className="min-w-[18px] text-right font-condensed font-bold text-accent">{index + 1}</span>
            <span className="tracking-[-2px] text-faint" aria-hidden="true">
              ⋮⋮
            </span>
          </>
        )}
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-well text-faint">
          <Thumb url={player.photo} iconSize={16} className="size-full object-cover object-top" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{player.name}</span>
        {ticked && (
          <>
            <Button
              variant="ghost"
              className={cn(ICON, "size-[30px] text-sm")}
              aria-label="Move up"
              disabled={index === 0}
              onClick={() => save(moveInLineup(ids, index, index - 1))}
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              className={cn(ICON, "size-[30px] text-sm")}
              aria-label="Move down"
              disabled={index === lineup.length - 1}
              onClick={() => save(moveInLineup(ids, index, index + 1))}
            >
              ↓
            </Button>
          </>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <Row>
        <strong className="font-condensed text-sm tracking-[0.06em] uppercase">
          {data.teams[side]?.name ?? side} · {lineup.length} of {squad.length} playing
        </strong>
        <Spacer />
        <Button
          variant="small"
          onClick={() => save([...ids, ...squad.map((p) => p.id).filter((id) => !ids.includes(id))])}
        >
          Tick all
        </Button>
        <Button variant="small" onClick={() => save([])}>
          Clear
        </Button>
      </Row>
      <ol className="flex flex-col gap-1">
        {squad.length ? (
          [...lineup.map((p, i) => row(p, i)), ...bench.map((p) => row(p, null))]
        ) : (
          <li>
            <Hint>No players in this squad yet. Add them on the Setup page.</Hint>
          </li>
        )}
      </ol>
    </div>
  );
}
