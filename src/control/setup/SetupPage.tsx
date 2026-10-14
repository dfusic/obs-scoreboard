import { useStore } from "@shared/react/store";
import { useState } from "react";
import { useTeams } from "../teams";
import { PanelBoundary } from "../ui";
import { RosterPanel } from "./RosterPanel";
import { SceneSettingsPanel } from "./SceneSettingsPanel";
import { TeamsPanel } from "./TeamsPanel";

/** Setup: teams, squads and scene templates. */
export function SetupPage({ hidden, previewEnabled }: { hidden: boolean; previewEnabled: boolean }) {
  const store = useStore();
  const teams = useTeams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  // A team just added shows once its snapshot arrives (not the first team meanwhile, which
  // would take the operator's typing). Otherwise fall back to the first team, e.g. after a delete.
  const awaitingCreated = selectedId !== null && selectedId === createdId;
  const team = teams.find((t) => t.id === selectedId) ?? (awaitingCreated ? null : (teams[0] ?? null));

  const addTeam = () => {
    const id = store.teams.create();
    setCreatedId(id);
    setSelectedId(id);
  };

  return (
    <div hidden={hidden} className="grid grid-cols-2 gap-4 max-[820px]:grid-cols-[minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <PanelBoundary name="Teams">
          <TeamsPanel teams={teams} selected={team} createdId={createdId} onSelect={setSelectedId} onAdd={addTeam} />
        </PanelBoundary>
        <PanelBoundary name="Squad">
          <RosterPanel team={team} />
        </PanelBoundary>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <PanelBoundary name="Scenes">
          <SceneSettingsPanel previewEnabled={previewEnabled} />
        </PanelBoundary>
      </div>
    </div>
  );
}
