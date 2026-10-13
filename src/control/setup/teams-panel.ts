import { esc } from "@shared/html";
import { createTeam, deleteTeam, updateTeam, type TeamFields } from "@shared/teamRepo";
import type { TeamProfile } from "@shared/types";
import { bindImageUpload, IMAGE_ICON, LOGO_IMAGE, setFieldValue, setThumb, UPLOAD_ICON } from "../dom";

let teams: TeamProfile[] = [];
let selectedId: string | null = null;
let listKey = "";
let onSelect: (team: TeamProfile | null) => void = () => {};

const TEXT_FIELDS = ["name", "shortName", "primaryColor", "secondaryColor"] as const;

const selectedTeam = () => teams.find((t) => t.id === selectedId) ?? null;

export function initTeamsPanel(root: HTMLElement, onSelectTeam: (team: TeamProfile | null) => void): void {
  onSelect = onSelectTeam;
  root.innerHTML = `
    <div class="panel-title row">
      Teams
      <div class="spacer"></div>
      <button id="add-team-btn" type="button" class="btn-small">+ Add team</button>
    </div>
    <div class="panel-body">
      <p data-role="empty" class="hint">No teams yet. Add the clubs you broadcast, then their players.</p>
      <div data-role="list" class="team-list"></div>
      <div data-role="editor" class="editor" hidden>
        <div class="form-grid">
          <div class="field"><label for="team-name">Name</label><input id="team-name" data-field="name" type="text" /></div>
          <div class="field"><label for="team-short">Short name</label><input id="team-short" data-field="shortName" type="text" maxlength="4" placeholder="e.g. GRA" /></div>
          <div class="field"><label for="team-primary">Primary colour</label><input id="team-primary" data-field="primaryColor" type="color" /></div>
          <div class="field"><label for="team-secondary">Secondary colour</label><input id="team-secondary" data-field="secondaryColor" type="color" /></div>
        </div>
        <div class="logo-row">
          <div class="logo-thumb" data-role="thumb">${IMAGE_ICON}</div>
          <div class="logo-actions">
            <label class="upload-btn">${UPLOAD_ICON} Upload logo<input data-role="file" type="file" accept="image/*" /></label>
            <button data-role="clear-logo" type="button" class="btn-ghost logo-remove">Remove logo</button>
          </div>
        </div>
        <span data-role="status" class="error-text" hidden></span>
        <button data-role="delete" type="button" class="btn-danger">Delete team</button>
      </div>
    </div>
  `;

  root.querySelector("#add-team-btn")!.addEventListener("click", async () => {
    selectedId = await createTeam();
    render(root);
    root.querySelector<HTMLInputElement>("#team-name")?.select();
  });

  root.querySelector('[data-role="list"]')!.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-team]");
    if (!btn) return;
    selectedId = btn.dataset.team!;
    render(root);
  });

  for (const input of root.querySelectorAll<HTMLInputElement>("[data-field]")) {
    input.addEventListener("change", () => {
      if (!selectedId) return;
      const field = input.dataset.field as (typeof TEXT_FIELDS)[number];
      const value = field === "shortName" ? input.value.trim().toUpperCase() : input.value.trim();
      if (field === "name" && !value) return;
      void updateTeam(selectedId, { [field]: value } as Partial<TeamFields>);
    });
  }

  bindImageUpload(
    root.querySelector('[data-role="file"]')!,
    root.querySelector('[data-role="status"]')!,
    LOGO_IMAGE,
    async (logo) => {
      if (selectedId) await updateTeam(selectedId, { logo });
    },
  );

  root.querySelector('[data-role="clear-logo"]')!.addEventListener("click", () => {
    if (selectedId) void updateTeam(selectedId, { logo: null });
  });

  root.querySelector('[data-role="delete"]')!.addEventListener("click", () => {
    const team = selectedTeam();
    if (team && confirm(`Delete ${team.name} and all its players?`)) {
      selectedId = null;
      void deleteTeam(team.id);
    }
  });
}

function render(root: HTMLElement): void {
  if (!selectedTeam()) selectedId = teams[0]?.id ?? null;
  const team = selectedTeam();

  // Logo length stands in for the logo itself, so the key stays small.
  const key = `${selectedId}#` + teams.map((t) => `${t.id}:${t.name}:${t.logo?.length ?? 0}`).join("|");
  if (key !== listKey) {
    listKey = key;
    root.querySelector('[data-role="list"]')!.innerHTML = teams
      .map(
        (t) => `
          <button data-team="${esc(t.id)}" type="button" class="team-chip${t.id === selectedId ? " active" : ""}">
            <span class="chip-logo" data-logo="${esc(t.id)}"></span>${esc(t.name)}
          </button>
        `,
      )
      .join("");
    for (const t of teams) setThumb(root.querySelector<HTMLElement>(`[data-logo="${CSS.escape(t.id)}"]`)!, t.logo);
  }

  (root.querySelector('[data-role="empty"]') as HTMLElement).hidden = teams.length > 0;
  (root.querySelector('[data-role="editor"]') as HTMLElement).hidden = !team;
  if (team) {
    for (const input of root.querySelectorAll<HTMLInputElement>("[data-field]")) {
      setFieldValue(input, team[input.dataset.field as (typeof TEXT_FIELDS)[number]]);
    }
    setThumb(root.querySelector('[data-role="thumb"]')!, team.logo);
    (root.querySelector('[data-role="clear-logo"]') as HTMLElement).hidden = !team.logo;
  }
  onSelect(team);
}

export function updateTeamsPanel(root: HTMLElement, next: TeamProfile[]): void {
  teams = next;
  render(root);
}
