import { esc } from "@shared/html";
import { moveInLineup, toggleInLineup } from "@shared/lineup";
import type { LiveData } from "@shared/liveFeed";
import { setAwayPlayers, setLineup } from "@shared/matchRepo";
import { SIDES, type Player, type Side } from "@shared/types";
import { setThumb } from "../dom";

let latest: LiveData | null = null;
const renderedKeys: Record<Side, string> = { home: "", away: "" };

/** Current lineup ids of a side, limited to players that still exist. */
function lineupIds(side: Side): string[] {
  return latest ? latest.lineups[side].map((p) => p.id) : [];
}

function saveLineup(side: Side, ids: string[]): void {
  void setLineup(side, ids);
}

function rowHtml(player: Player, index: number | null, count: number): string {
  const ticked = index !== null;
  return `
    <li class="lineup-row${ticked ? " ticked" : ""}" data-id="${esc(player.id)}"
        ${ticked ? `draggable="true" data-index="${index}"` : ""}>
      <input type="checkbox" data-action="toggle" ${ticked ? "checked" : ""} aria-label="Playing: ${esc(player.name)}" />
      ${ticked ? `<span class="lineup-pos">${index + 1}</span><span class="drag-handle" aria-hidden="true">⋮⋮</span>` : ""}
      <span class="lineup-thumb" data-photo></span>
      <span class="lineup-name">${esc(player.name)}</span>
      ${
        ticked
          ? `<button type="button" class="btn-ghost btn-icon" data-action="up" aria-label="Move up" ${index === 0 ? "disabled" : ""}>↑</button>
             <button type="button" class="btn-ghost btn-icon" data-action="down" aria-label="Move down" ${index === count - 1 ? "disabled" : ""}>↓</button>`
          : ""
      }
    </li>
  `;
}

function renderSide(root: HTMLElement, side: Side): void {
  const data = latest!;
  const section = root.querySelector<HTMLElement>(`[data-lineup-side="${side}"]`)!;
  const enabled = side === "home" || data.match.awayPlayers;
  section.hidden = !enabled || !data.match.teams[side];

  const lineup = data.lineups[side];
  const bench = data.squads[side].filter((p) => !lineup.includes(p));
  const key = [...lineup, ...bench].map((p) => `${p.id}:${p.name}:${p.photo?.length ?? 0}`).join("|") + `#${lineup.length}#${data.teams[side]?.name}`;
  if (key === renderedKeys[side]) return;
  renderedKeys[side] = key;

  const team = data.teams[side];
  section.querySelector('[data-role="heading"]')!.textContent =
    `${team?.name ?? side} · ${lineup.length} of ${data.squads[side].length} playing`;
  const list = section.querySelector<HTMLElement>('[data-role="list"]')!;
  list.innerHTML = data.squads[side].length
    ? lineup.map((p, i) => rowHtml(p, i, lineup.length)).join("") + bench.map((p) => rowHtml(p, null, 0)).join("")
    : `<li class="hint">No players in this squad yet. Add them on the Setup page.</li>`;
  for (const p of [...lineup, ...bench]) {
    setThumb(list.querySelector<HTMLElement>(`[data-id="${CSS.escape(p.id)}"] [data-photo]`)!, p.photo);
  }
}

export function initLineupPanel(root: HTMLElement): void {
  root.innerHTML = `
    <div class="panel-title">Lineup</div>
    <div class="panel-body">
      <p class="hint">Before the game, tick who is playing and drag them into presentation order.
        The intro, lineup, goal scorer and player card all use this list.</p>
      <label class="check">
        <input id="away-players-toggle" type="checkbox" />
        Away team players &amp; photos available
      </label>
      ${SIDES.map(
        (side) => `
          <div data-lineup-side="${side}" class="lineup-side" hidden>
            <div class="row">
              <strong data-role="heading" class="lineup-heading"></strong>
              <div class="spacer"></div>
              <button type="button" class="btn-small" data-action="all">Tick all</button>
              <button type="button" class="btn-small" data-action="none">Clear</button>
            </div>
            <ol data-role="list" class="lineup-rows"></ol>
          </div>
        `,
      ).join("")}
    </div>
  `;

  root.querySelector<HTMLInputElement>("#away-players-toggle")!.addEventListener("change", (e) => {
    void setAwayPlayers((e.target as HTMLInputElement).checked);
  });

  for (const side of SIDES) {
    const section = root.querySelector<HTMLElement>(`[data-lineup-side="${side}"]`)!;

    section.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
      const id = target.closest<HTMLElement>("[data-id]")?.dataset.id;
      const ids = lineupIds(side);
      if (action === "all" && latest) saveLineup(side, [...ids, ...latest.squads[side].map((p) => p.id).filter((x) => !ids.includes(x))]);
      else if (action === "none") saveLineup(side, []);
      else if (action === "toggle" && id) saveLineup(side, toggleInLineup(ids, id));
      else if ((action === "up" || action === "down") && id) {
        const from = ids.indexOf(id);
        saveLineup(side, moveInLineup(ids, from, from + (action === "up" ? -1 : 1)));
      }
    });

    // Drag and drop between ticked rows.
    let dragFrom: number | null = null;
    section.addEventListener("dragstart", (e) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
      if (!row) return;
      dragFrom = Number(row.dataset.index);
      row.classList.add("dragging");
      e.dataTransfer?.setData("text/plain", row.dataset.id!);
    });
    section.addEventListener("dragover", (e) => {
      if (dragFrom !== null && (e.target as HTMLElement).closest("[data-index]")) e.preventDefault();
    });
    section.addEventListener("drop", (e) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
      if (!row || dragFrom === null) return;
      e.preventDefault();
      saveLineup(side, moveInLineup(lineupIds(side), dragFrom, Number(row.dataset.index)));
    });
    section.addEventListener("dragend", () => {
      dragFrom = null;
      section.querySelector(".dragging")?.classList.remove("dragging");
    });
  }
}

export function updateLineupPanel(root: HTMLElement, data: LiveData): void {
  latest = data;
  root.querySelector<HTMLInputElement>("#away-players-toggle")!.checked = data.match.awayPlayers;
  for (const side of SIDES) renderSide(root, side);
}
