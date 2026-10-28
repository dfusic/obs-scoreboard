import { moveInLineup, toggleInLineup } from "@shared/lineup";
import { sidesWithPlayers } from "@shared/liveFeed";
import { useLiveData, useStore } from "@shared/react/store";
import type { Player, Side } from "@shared/types";
import { useId, useState } from "react";
import { Button, cn, Hint, ICON, Row, Spacer, Thumb } from "../ui";

/** "Home" / "Away", or the team's name when it is set. */
export const sideLabel = (side: Side) => (side === "home" ? "Home" : "Away");

/** "11 of 18 picked" for a side. */
export function lineupCount(lineup: number, squad: number) {
  return `${lineup} of ${squad} picked`;
}

/**
 * Home / Away tabs for the lineup, shown only when away players are on (else home only).
 * Keeps the choice valid when away players are switched off.
 */
export function useLineupSide(): [Side, (side: Side) => void, Side[]] {
  const { match } = useLiveData();
  const sides = sidesWithPlayers(match);
  const [side, setSide] = useState<Side>("home");
  return [sides.includes(side) ? side : "home", setSide, sides];
}

export function SideTabs({ side, onChange, sides }: { side: Side; onChange: (side: Side) => void; sides: Side[] }) {
  const data = useLiveData();
  if (sides.length < 2) return null;
  return (
    <div role="tablist" aria-label="Team" className="flex gap-1.5">
      {sides.map((s) => (
        <Button
          key={s}
          role="tab"
          variant="tab"
          aria-selected={side === s}
          className={cn("max-w-[220px] truncate", side === s && "border-accent bg-accent text-white")}
          onClick={() => onChange(s)}
        >
          {sideLabel(s)}
          {data.teams[s] && ` · ${data.teams[s].name}`}
        </Button>
      ))}
    </div>
  );
}

/**
 * Who plays for one side and in which order (the player intro's order). Saves as you go;
 * changes show on air at once (e.g. a lineup scene on air). Used on Match setup and in the
 * Live page's lineup dialog: give it a `key` per side.
 */
export function LineupEditor({ side, className }: { side: Side; className?: string }) {
  const store = useStore();
  const data = useLiveData();
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  // Unique per editor: Match setup and the Live dialog can both have one mounted.
  const headingId = useId();

  const team = data.teams[side];
  const lineup = data.lineups[side];
  const squad = data.squads[side];
  const bench = squad.filter((p) => !lineup.includes(p));
  // Current lineup ids, limited to players that still exist.
  const ids = lineup.map((p) => p.id);
  const save = (next: string[]) => void store.match.setLineup(side, next);

  if (!team) {
    return (
      <Hint className={className}>
        No {side} team yet. Pick it under Teams{" "}
        <a href="#/match" className="text-soft">
          on Match setup
        </a>
        .
      </Hint>
    );
  }
  if (!squad.length) {
    return (
      <Hint className={className}>
        {team.name} has no players yet.{" "}
        <a href="#/teams" className="text-soft">
          Add them on the Teams page.
        </a>
      </Hint>
    );
  }

  const photo = (player: Player) => (
    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-well text-faint">
      <Thumb url={player.photo} iconSize={16} className="size-full object-cover object-top" />
    </span>
  );
  const rowClass = "flex min-h-11 items-center gap-2.5 rounded-sm border px-2 py-1";
  const smallIcon = cn(ICON, "size-[30px] shrink-0 text-sm");

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Row>
        <strong className="font-condensed text-sm tracking-[0.06em] text-fg uppercase">
          {team.name} · {lineupCount(lineup.length, squad.length)}
        </strong>
        <Spacer />
        <Button
          variant="small"
          disabled={!bench.length}
          onClick={() => save([...ids, ...bench.map((p) => p.id)])}
        >
          Pick all
        </Button>
        <Button
          variant="small"
          disabled={!lineup.length}
          onClick={() => confirm(`Clear the ${team.name} lineup?`) && save([])}
        >
          Clear
        </Button>
      </Row>

      <section aria-labelledby={`${headingId}-playing`} className="flex flex-col gap-1.5">
        <h3 id={`${headingId}-playing`} className="m-0 text-xs font-medium tracking-[0.04em] text-dim">
          Playing · intro order
        </h3>
        {lineup.length ? (
          <ol className="m-0 flex list-none flex-col gap-1 p-0">
            {lineup.map((player, index) => (
              <li
                key={player.id}
                draggable
                onDragStart={(e) => {
                  setDragFrom(index);
                  e.dataTransfer.setData("text/plain", player.id);
                }}
                onDragOver={dragFrom !== null ? (e) => e.preventDefault() : undefined}
                onDrop={
                  dragFrom !== null
                    ? (e) => {
                        e.preventDefault();
                        save(moveInLineup(ids, dragFrom, index));
                      }
                    : undefined
                }
                onDragEnd={() => setDragFrom(null)}
                className={cn(
                  rowClass,
                  "cursor-grab border-line-strong bg-control text-fg",
                  dragFrom === index && "opacity-40",
                )}
              >
                <span className="min-w-[18px] text-right font-condensed font-bold text-accent">{index + 1}</span>
                <span className="tracking-[-2px] text-faint" aria-hidden="true">
                  ⋮⋮
                </span>
                {photo(player)}
                <span className="min-w-0 flex-1 truncate text-sm">{player.name}</span>
                <Button
                  variant="ghost"
                  className={smallIcon}
                  aria-label={`Move ${player.name} up`}
                  disabled={index === 0}
                  onClick={() => save(moveInLineup(ids, index, index - 1))}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  className={smallIcon}
                  aria-label={`Move ${player.name} down`}
                  disabled={index === lineup.length - 1}
                  onClick={() => save(moveInLineup(ids, index, index + 1))}
                >
                  ↓
                </Button>
                <Button
                  variant="small"
                  aria-label={`Bench ${player.name}`}
                  onClick={() => save(toggleInLineup(ids, player.id))}
                >
                  Bench
                </Button>
              </li>
            ))}
          </ol>
        ) : (
          <Hint>Nobody picked yet: scenes use the whole squad. Add players below in intro order.</Hint>
        )}
      </section>

      {bench.length > 0 && (
        <section aria-labelledby={`${headingId}-bench`} className="flex flex-col gap-1.5">
          <h3 id={`${headingId}-bench`} className="m-0 text-xs font-medium tracking-[0.04em] text-dim">
            Not playing
          </h3>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {bench.map((player) => (
              <li key={player.id} className={cn(rowClass, "border-line text-dim")}>
                {photo(player)}
                <span className="min-w-0 flex-1 truncate text-sm">{player.name}</span>
                <Button
                  variant="small"
                  aria-label={`Add ${player.name}`}
                  onClick={() => save(toggleInLineup(ids, player.id))}
                >
                  Add
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
