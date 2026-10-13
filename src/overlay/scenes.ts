import { esc } from "@shared/html";
import { matchPlayers, type LiveData } from "@shared/liveFeed";
import { goalMinute } from "@shared/program";
import type { Player, SceneConfig, SceneType, Side, TeamProfile } from "@shared/types";

/** What a scene is about, after applying any preview override. */
export interface SceneTarget {
  side: Side;
  player: Player | null;
}

type Renderer = (data: LiveData, config: SceneConfig, target: SceneTarget) => string;

const sideLabel = (side: Side) => (side === "home" ? "Home" : "Away");
const teamName = (team: TeamProfile | null, side: Side) => team?.name || sideLabel(side);
const shortName = (team: TeamProfile | null, side: Side) => team?.shortName || teamName(team, side);

/** Inline style setting a team's colours as CSS custom properties. */
function teamVars(team: TeamProfile | null): string {
  if (!team) return "";
  return `--team-primary: ${esc(team.primaryColor)}; --team-secondary: ${esc(team.secondaryColor)};`;
}

function logoImg(team: TeamProfile | null, cls: string): string {
  return team?.logo ? `<img class="${cls}" src="${esc(team.logo)}" alt="" />` : `<div class="${cls} logo-empty"></div>`;
}

function header(config: SceneConfig): string {
  return `
    ${config.title ? `<div class="card-title">${esc(config.title)}</div>` : ""}
    ${config.subtitle ? `<div class="card-subtitle">${esc(config.subtitle)}</div>` : ""}
  `;
}

function teamBlock(data: LiveData, side: Side): string {
  const team = data.teams[side];
  return `
    <div class="team-block" style="${teamVars(team)}">
      ${logoImg(team, "team-logo")}
      <div class="team-name">${esc(teamName(team, side))}</div>
    </div>
  `;
}

function scoreLine(data: LiveData): string {
  const { score } = data.match;
  return `
    <div class="score-line">
      <span>${esc(shortName(data.teams.home, "home"))}</span>
      <span class="score-line-num">${score.home}</span>
      <span class="score-line-sep">:</span>
      <span class="score-line-num">${score.away}</span>
      <span>${esc(shortName(data.teams.away, "away"))}</span>
    </div>
  `;
}

function scorers(data: LiveData, side: Side): string {
  const rows = data.match.goals
    .filter((g) => g.side === side)
    .map((g) => {
      const name = (g.playerId && data.players.get(g.playerId)?.name) || "Goal";
      return `<li>${esc(name)} <span class="minute">${goalMinute(g.elapsedMs)}'</span></li>`;
    });
  return `<ul class="scorers">${rows.join("")}</ul>`;
}

/** Big photo (or the team logo when there is none) next to the player's details. */
function playerFeature(data: LiveData, config: SceneConfig, target: SceneTarget, extra: string): string {
  const team = data.teams[target.side];
  const { player } = target;
  const photo = player?.photo
    ? `<img class="feature-photo" src="${esc(player.photo)}" alt="" />`
    : logoImg(team, "feature-photo feature-logo");
  return `
    <div class="card feature" style="${teamVars(team)}">
      <div class="feature-media">${photo}</div>
      <div class="feature-text">
        ${header(config)}
        <div class="feature-name">${esc(player?.name || teamName(team, target.side))}</div>
        <div class="feature-meta">${esc(teamName(team, target.side))}</div>
        ${extra}
      </div>
    </div>
  `;
}

/** "Adrijan Coha" -> ["Adrijan", "Coha"]: surname on its own, larger line. */
export function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? [parts.slice(0, -1).join(" "), parts[parts.length - 1]] : ["", parts[0] ?? ""];
}

/**
 * Player intro: one lineup player at a time, stepped manually from the Live page.
 * Design: team-colour band with the crest, first name over a larger surname, and the
 * player's PNG cut-out standing on the bottom edge. Names are shrunk to fit by main.ts.
 */
function presentationScene(data: LiveData, config: SceneConfig, target: SceneTarget): string {
  const team = data.teams[target.side];
  const player = target.player;
  const [first, last] = splitName(player?.name ?? "");
  // A custom background image (Setup > Scenes) replaces the built-in striped one.
  return `
    <div class="intro${config.background ? "" : " intro-default-bg"}" style="${teamVars(team)}">
      <div class="intro-band"></div>
      ${team?.logo ? `<img class="intro-crest" src="${esc(team.logo)}" alt="" />` : ""}
      <div class="intro-name" data-fit>
        ${first ? `<span class="intro-first">${esc(first)}</span>` : ""}
        <span class="intro-last">${esc(last)}</span>
      </div>
      ${player?.photo ? `<img class="intro-photo" src="${esc(player.photo)}" alt="" />` : ""}
    </div>
  `;
}

function resultScene(data: LiveData, config: SceneConfig): string {
  const { score } = data.match;
  return `
    <div class="card result">
      ${header(config)}
      <div class="matchup">
        <div class="result-side">${teamBlock(data, "home")}${scorers(data, "home")}</div>
        <div class="result-score">${score.home}<span class="score-line-sep">:</span>${score.away}</div>
        <div class="result-side">${teamBlock(data, "away")}${scorers(data, "away")}</div>
      </div>
    </div>
  `;
}

export const SCENE_RENDERERS: Record<Exclude<SceneType, "scoreboard">, Renderer> = {
  welcome: (data, config) => `
    <div class="card welcome">
      ${header(config)}
      <div class="matchup">
        ${teamBlock(data, "home")}
        <div class="vs">VS</div>
        ${teamBlock(data, "away")}
      </div>
    </div>
  `,

  goal: (data, config, target) => {
    const goal = [...data.match.goals].reverse().find((g) => g.side === target.side);
    const minute = goal ? `<div class="feature-minute">${goalMinute(goal.elapsedMs)}'</div>` : "";
    return playerFeature(data, config, target, minute + scoreLine(data));
  },

  presentation: presentationScene,

  playerCard: (data, config, target) => playerFeature(data, config, target, ""),

  lineup: (data, config, target) => {
    const team = data.teams[target.side];
    const rows = matchPlayers(data, target.side).map((p) => `<li>${esc(p.name)}</li>`);
    return `
      <div class="card lineup" style="${teamVars(team)}">
        <div class="lineup-header">
          ${logoImg(team, "lineup-logo")}
          <div>
            ${header(config)}
            <div class="feature-name">${esc(teamName(team, target.side))}</div>
          </div>
        </div>
        <ol class="lineup-list">${rows.join("")}</ol>
      </div>
    `;
  },

  halftime: resultScene,
  fulltime: resultScene,
};
