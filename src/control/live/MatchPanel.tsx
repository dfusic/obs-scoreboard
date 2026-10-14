import { useLiveData, useStore } from "@shared/react/store";
import { SIDES } from "@shared/types";
import { useTeams } from "../teamsContext";
import { cn, Hint, Panel, PanelBody, PanelTitle, Thumb } from "../ui";

/** Picks the two teams playing, one pill per team. */
export function MatchPanel() {
  const store = useStore();
  const { match } = useLiveData();
  const teams = useTeams();
  return (
    <Panel>
      <PanelTitle>Match Teams</PanelTitle>
      <PanelBody className="grid grid-cols-2 gap-3.5 max-[640px]:grid-cols-1">
        {SIDES.map((side) => (
          <div key={side} role="group" aria-labelledby={`match-${side}`} className="flex min-w-0 flex-col gap-1.5">
            <span id={`match-${side}`} className="text-xs font-medium tracking-[0.04em] text-dim">
              {side === "home" ? "Home team" : "Away team"}
            </span>
            <div className="flex flex-wrap gap-2">
              {teams.map((t) => {
                const picked = match.teams[side] === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={picked}
                    onClick={() => !picked && void store.match.setTeam(side, t.id)}
                    className={cn(
                      "flex h-[34px] items-center gap-1.5 border border-line-strong bg-transparent pr-3.5 pl-1.5 text-xs tracking-[0.06em] text-muted",
                      picked && "border-accent bg-[#1a2035] text-white",
                    )}
                  >
                    <span className="flex size-6 items-center justify-center text-faint">
                      <Thumb url={t.logo} iconSize={14} className="max-h-6 max-w-6 object-contain" />
                    </span>
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {teams.length === 0 && (
          <Hint className="col-span-full">
            No teams yet. <a href="#/teams" className="text-soft">Add them on the Teams page.</a>
          </Hint>
        )}
      </PanelBody>
    </Panel>
  );
}
