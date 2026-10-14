import { useStore } from "@shared/react/store";
import type { TeamFields, TeamProfile } from "@shared/types";
import { useEffect, useRef } from "react";
import { LOGO_IMAGE } from "../images";
import {
  Button,
  cn,
  CommitInput,
  ErrorText,
  Field,
  Hint,
  Panel,
  PanelBody,
  PanelTitle,
  Spacer,
  Thumb,
  UploadButton,
  useImageUpload,
} from "../ui";

export function TeamsPanel({
  teams,
  selected,
  createdId,
  onSelect,
  onAdd,
}: {
  teams: TeamProfile[];
  selected: TeamProfile | null;
  /** A team just added: its name field is selected once it shows up. */
  createdId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <Panel>
      <PanelTitle>
        Teams
        <Spacer />
        <Button variant="small" onClick={onAdd}>
          + Add team
        </Button>
      </PanelTitle>
      <PanelBody>
        {teams.length === 0 && <Hint>No teams yet. Add the clubs you broadcast, then their players.</Hint>}
        <div className="flex flex-wrap gap-2">
          {teams.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={cn(
                "flex h-10 items-center gap-2 border border-line-strong bg-control pr-3 pl-1.5 text-[13px] text-soft",
                t.id === selected?.id && "border-accent text-fg",
              )}
            >
              <span className="flex size-7 items-center justify-center text-faint">
                <Thumb url={t.logo} className="max-h-7 max-w-7 object-contain" />
              </span>
              {t.name}
            </button>
          ))}
        </div>
        {selected && <TeamEditor key={selected.id} team={selected} selectName={createdId === selected.id} />}
      </PanelBody>
    </Panel>
  );
}

function TeamEditor({ team, selectName }: { team: TeamProfile; selectName: boolean }) {
  const store = useStore();
  const nameRef = useRef<HTMLInputElement>(null);
  const upload = useImageUpload(LOGO_IMAGE, (logo) => store.teams.update(team.id, { logo }));
  const save = (fields: Partial<TeamFields>) => void store.teams.update(team.id, fields);

  useEffect(() => {
    if (selectName) nameRef.current?.select();
  }, [selectName]);

  return (
    <div className="flex flex-col gap-3.5 border-t border-line pt-3.5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" htmlFor="team-name">
          <CommitInput
            ref={nameRef}
            id="team-name"
            type="text"
            value={team.name}
            onCommit={(v) => v.trim() && save({ name: v.trim() })}
          />
        </Field>
        <Field label="Short name" htmlFor="team-short">
          <CommitInput
            id="team-short"
            type="text"
            maxLength={4}
            placeholder="e.g. GRA"
            value={team.shortName}
            onCommit={(v) => save({ shortName: v.trim().toUpperCase() })}
          />
        </Field>
        <Field label="Primary colour" htmlFor="team-primary">
          <CommitInput id="team-primary" type="color" value={team.primaryColor} onCommit={(v) => save({ primaryColor: v })} />
        </Field>
        <Field label="Secondary colour" htmlFor="team-secondary">
          <CommitInput
            id="team-secondary"
            type="color"
            value={team.secondaryColor}
            onCommit={(v) => save({ secondaryColor: v })}
          />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line-strong bg-well text-faint">
          <Thumb url={team.logo} className="size-12 object-contain" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <UploadButton onChange={upload.onChange}>Upload logo</UploadButton>
          {team.logo && (
            <Button variant="ghost" className="h-7 w-full text-[11px]" onClick={() => save({ logo: null })}>
              Remove logo
            </Button>
          )}
        </div>
      </div>
      {upload.status && <ErrorText>{upload.status}</ErrorText>}
      <Button
        variant="danger"
        onClick={() => confirm(`Delete ${team.name} and all its players?`) && void store.teams.remove(team.id)}
      >
        Delete team
      </Button>
    </div>
  );
}
