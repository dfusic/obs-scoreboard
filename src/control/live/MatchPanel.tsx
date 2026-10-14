import { useLiveData, useStore } from "@shared/react/store";
import { SIDES } from "@shared/types";
import { useTeams } from "../teams";
import { Field, Panel, PanelBody, PanelTitle } from "../ui";

export function MatchPanel() {
  const store = useStore();
  const { match } = useLiveData();
  const teams = useTeams();
  return (
    <Panel>
      <PanelTitle>Match</PanelTitle>
      <PanelBody>
        {SIDES.map((side) => (
          <Field key={side} label={side === "home" ? "Home team" : "Away team"} htmlFor={`match-${side}`}>
            <select
              id={`match-${side}`}
              value={match.teams[side] ?? ""}
              onChange={(e) => void store.match.setTeam(side, e.target.value || null)}
            >
              <option value="">— Pick a team —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        ))}
        <a href="#/setup" className="text-xs text-dim hover:text-soft">
          Add or edit teams in Setup
        </a>
      </PanelBody>
    </Panel>
  );
}
