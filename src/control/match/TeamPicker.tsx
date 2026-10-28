import { computeElapsedMs } from "@shared/clock";
import { useSubscription } from "@shared/react/hooks";
import { useLiveData, useStore } from "@shared/react/store";
import type { Player, Side, TeamProfile } from "@shared/types";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useTeams } from "../teamsContext";
import { Button, cn, Hint, Thumb } from "../ui";
import { sideLabel } from "./LineupEditor";

function Crest({ team, size = "size-10" }: { team: TeamProfile; size?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center text-faint", size)}>
      <Thumb url={team.logo} iconSize={18} className="max-h-full max-w-full object-contain" />
    </span>
  );
}

const playersText = (n: number) => (n === 1 ? "1 player" : `${n} players`);

/** Squad size of one team: stored on the team, or counted (older teams) while its card is shown. */
function PlayerCount({ team }: { team: TeamProfile }) {
  return team.playerCount !== null ? <>{playersText(team.playerCount)}</> : <CountedPlayers teamId={team.id} />;
}

function CountedPlayers({ teamId }: { teamId: string }) {
  const store = useStore();
  const players = useSubscription<Player[] | null>((cb) => store.players.subscribe([teamId], cb), null, [store, teamId]);
  return players ? <>{playersText(players.length)}</> : null;
}

/**
 * One side's team for this match: the selected team as a card, and a searchable list to
 * change it. Changing a team clears that side's lineup (asked first when one is picked or the
 * match is under way).
 */
export function TeamPicker({ side }: { side: Side }) {
  const store = useStore();
  const { match } = useLiveData();
  const teams = useTeams();
  const team = teams.find((t) => t.id === match.teams[side]) ?? null;
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const changeRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const labelId = useId();

  const q = query.trim().toLowerCase();
  const results = teams.filter(
    (t) => !q || t.name.toLowerCase().includes(q) || t.city.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q),
  );
  const activeIndex = Math.min(active, results.length - 1);

  const open = () => {
    setQuery("");
    setActive(Math.max(0, teams.findIndex((t) => t.id === match.teams[side])));
    setSearching(true);
  };
  const close = () => {
    setSearching(false);
    requestAnimationFrame(() => changeRef.current?.focus());
  };
  const pick = (picked: TeamProfile) => {
    if (picked.id !== match.teams[side]) {
      const lineup = match.lineup[side].length;
      // Under way: the clock has run or there are goals. The new team shows on air at once.
      const underWay = match.clock.running || computeElapsedMs(match.clock, Date.now()) > 0 || match.goals.length > 0;
      const notes = [
        underWay && "The match is under way and the new team shows on air at once.",
        lineup > 0 && `Its lineup of ${lineup} players is cleared.`,
      ].filter(Boolean);
      if (notes.length && !confirm(`Change the ${side} team to ${picked.name}? ${notes.join(" ")}`)) return;
      void store.match.setTeam(side, picked.id);
    }
    close();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") setActive(Math.min(results.length - 1, activeIndex + 1));
    else if (e.key === "ArrowUp") setActive(Math.max(0, activeIndex - 1));
    else if (e.key === "Enter" && results[activeIndex]) pick(results[activeIndex]);
    else if (e.key === "Escape" && team) close();
    else return;
    e.preventDefault();
  };

  const searchOpen = searching || !team;

  return (
    <div role="group" aria-labelledby={labelId} className="flex min-w-0 flex-col gap-2">
      <span id={labelId} className="text-xs font-medium tracking-[0.04em] text-dim">
        {sideLabel(side)} team
      </span>

      {team && !searching && (
        <div className="flex min-h-16 items-center gap-3 rounded-sm border border-line-strong bg-well px-3 py-2">
          <Crest team={team} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-condensed text-lg leading-tight font-bold tracking-[0.04em] text-white uppercase">
              {team.name}
            </div>
            <div className="truncate text-xs text-dim">
              {team.city && `${team.city} · `}
              <PlayerCount team={team} />
            </div>
          </div>
          <Button ref={changeRef} variant="small" onClick={open} aria-label={`Change ${side} team`}>
            Change
          </Button>
        </div>
      )}

      {searchOpen &&
        (teams.length === 0 ? (
          <Hint>
            No teams yet.{" "}
            <a href="#/teams" className="text-soft">
              Add them on the Teams page.
            </a>
          </Hint>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <input
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={results[activeIndex] ? `${listId}-${results[activeIndex].id}` : undefined}
                aria-label={`Search ${side} team`}
                placeholder="Search teams"
                autoFocus={searching}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
              />
              {team && (
                <Button variant="ghost" onClick={close}>
                  Cancel
                </Button>
              )}
            </div>
            <ul
              id={listId}
              role="listbox"
              aria-label={`${sideLabel(side)} team`}
              className="m-0 flex max-h-[220px] list-none flex-col gap-0.5 overflow-y-auto rounded-sm border border-line p-1"
            >
              {results.length ? (
                results.map((t, i) => (
                  <li
                    key={t.id}
                    id={`${listId}-${t.id}`}
                    role="option"
                    aria-selected={t.id === match.teams[side]}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => pick(t)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm text-soft",
                      i === activeIndex && "bg-control text-fg",
                      t.id === match.teams[side] && "text-accent",
                    )}
                  >
                    <Crest team={t} size="size-7" />
                    <span className="min-w-0 flex-1 truncate">{t.name}</span>
                    {t.city && <span className="truncate text-xs text-dim">{t.city}</span>}
                  </li>
                ))
              ) : (
                <li className="px-2 py-1.5">
                  <Hint>No team matches “{query}”.</Hint>
                </li>
              )}
            </ul>
          </div>
        ))}
    </div>
  );
}
