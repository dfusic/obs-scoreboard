import { useStore } from "@shared/react/store";
import type { TeamFields, TeamProfile } from "@shared/types";
import { useEffect, useRef, useState } from "react";
import { LOGO_IMAGE } from "../images";
import { useTeams } from "../teamsContext";
import {
  Button,
  CommitInput,
  ErrorText,
  Field,
  Hint,
  PageBody,
  PageHeader,
  Panel,
  PanelBoundary,
  PlusIcon,
  Thumb,
  UploadButton,
  useImageUpload,
} from "../ui";
import { Roster } from "./Roster";

/** Teams: one card per club with its details, logo and (expandable) squad. */
export function TeamsPage({ hidden }: { hidden: boolean }) {
  const store = useStore();
  const teams = useTeams();
  /** A team just added: its card scrolls into view with the name selected. */
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [openSquads, setOpenSquads] = useState<ReadonlySet<string>>(new Set());

  const addTeam = () => {
    const id = store.teams.create();
    setCreatedId(id);
    setOpenSquads((open) => new Set(open).add(id));
  };

  const toggleSquad = (id: string) =>
    setOpenSquads((open) => {
      const next = new Set(open);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <div hidden={hidden}>
      <PageHeader title="Team Configuration" sub="Clubs, colours, logos and squads">
        <Button variant="primary" onClick={addTeam}>
          <PlusIcon /> Add team
        </Button>
      </PageHeader>
      <PageBody>
        {teams.length === 0 && (
          <div className="px-5 py-16 text-center">
            <div className="font-condensed text-base font-bold tracking-[0.06em] text-dim uppercase">No teams yet</div>
            <Hint className="mt-1.5">Add the clubs you broadcast, then their players.</Hint>
          </div>
        )}
        {teams.map((t) => (
          <PanelBoundary key={t.id} name={t.name}>
            <TeamCard
              team={t}
              justCreated={t.id === createdId}
              squadOpen={openSquads.has(t.id)}
              onToggleSquad={() => toggleSquad(t.id)}
            />
          </PanelBoundary>
        ))}
      </PageBody>
    </div>
  );
}

function TeamCard({
  team,
  justCreated,
  squadOpen,
  onToggleSquad,
}: {
  team: TeamProfile;
  justCreated: boolean;
  squadOpen: boolean;
  onToggleSquad: () => void;
}) {
  const store = useStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const upload = useImageUpload(LOGO_IMAGE, (logo) => store.teams.update(team.id, { logo }));
  const save = (fields: Partial<TeamFields>) => void store.teams.update(team.id, fields);
  const id = (field: string) => `team-${team.id}-${field}`;

  useEffect(() => {
    if (!justCreated) return;
    cardRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    nameRef.current?.select();
  }, [justCreated]);

  return (
    <div ref={cardRef}>
      <Panel className="flex flex-col gap-3.5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line-strong bg-well text-faint">
            <Thumb url={team.logo} className="size-11 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-condensed text-lg font-bold tracking-[0.04em] text-white uppercase">
              {team.name}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-dim">
              <span className="size-3 rounded-full border border-line-strong" style={{ background: team.primaryColor }} />
              <span className="size-3 rounded-full border border-line-strong" style={{ background: team.secondaryColor }} />
              {team.shortName}
            </div>
          </div>
          <Button variant="ghost" aria-expanded={squadOpen} onClick={onToggleSquad}>
            Squad {squadOpen ? "▴" : "▾"}
          </Button>
          <Button
            variant="ghost"
            className="h-8 hover:border-danger hover:bg-transparent hover:text-danger"
            onClick={() => confirm(`Delete ${team.name} and all its players?`) && void store.teams.remove(team.id)}
          >
            Remove
          </Button>
        </div>

        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-3.5 max-[640px]:grid-cols-2">
          <Field label="Team name" htmlFor={id("name")}>
            <CommitInput
              ref={nameRef}
              id={id("name")}
              type="text"
              value={team.name}
              onCommit={(v) => v.trim() && save({ name: v.trim() })}
              className="h-10"
            />
          </Field>
          <Field label="City" htmlFor={id("city")}>
            <CommitInput
              id={id("city")}
              type="text"
              placeholder="e.g. Đurđevac"
              value={team.city}
              onCommit={(v) => save({ city: v.trim() })}
              className="h-10"
            />
          </Field>
          <Field label="Short code" htmlFor={id("short")}>
            <CommitInput
              id={id("short")}
              type="text"
              maxLength={4}
              placeholder="e.g. GRA"
              value={team.shortName}
              onCommit={(v) => save({ shortName: v.trim().toUpperCase() })}
              className="h-10"
            />
          </Field>
          <Field label="Primary colour" htmlFor={id("primary")}>
            <CommitInput id={id("primary")} type="color" value={team.primaryColor} className="h-10"
              onCommit={(v) => save({ primaryColor: v })} />
          </Field>
          <Field label="Secondary colour" htmlFor={id("secondary")}>
            <CommitInput id={id("secondary")} type="color" value={team.secondaryColor} className="h-10"
              onCommit={(v) => save({ secondaryColor: v })} />
          </Field>
        </div>

        <Field label="Club logo (PNG)">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[200px] flex-1">
              <UploadButton onChange={upload.onChange}>{team.logo ? "Replace logo" : "Upload logo"}</UploadButton>
            </div>
            {team.logo && (
              <Button variant="ghost" className="h-11" onClick={() => save({ logo: null })}>
                Remove logo
              </Button>
            )}
          </div>
          {upload.status && <ErrorText>{upload.status}</ErrorText>}
        </Field>

        {/* Mounted only while open, so collapsed cards don't subscribe to their players. */}
        {squadOpen && (
          <div className="border-t border-line pt-3.5">
            <Roster teamId={team.id} />
          </div>
        )}
      </Panel>
    </div>
  );
}
