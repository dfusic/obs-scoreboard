import type { GraphicsSettings, SceneType, ScoreboardColors } from "./types";

/**
 * Scoreboard templates. A template is a layout plus its default colours; the operator
 * picks one on the Graphics page and can then change its colours. To add a template,
 * add an entry here (a new layout also needs markup in overlay/scenes.tsx and CSS).
 */
export type ScoreboardLayout = "classic" | "bar";

export interface ScoreboardTemplate {
  id: string;
  name: string;
  layout: ScoreboardLayout;
  colors: ScoreboardColors;
}

export type ScoreboardColorKey = keyof ScoreboardColors;

/** The colours each layout uses, in editor order, with what they colour there. */
export const LAYOUT_COLORS: Record<ScoreboardLayout, { key: ScoreboardColorKey; label: string }[]> = {
  classic: [
    { key: "background", label: "Background" },
    { key: "score", label: "Score" },
    { key: "accent", label: "Clock panel" },
    { key: "timer", label: "Clock digits" },
  ],
  bar: [
    { key: "background", label: "Background" },
    { key: "score", label: "Score" },
    { key: "names", label: "Team names" },
    { key: "timer", label: "Timer" },
    { key: "accent", label: "Accent / half" },
  ],
};

/** Colour-themed "bar" template: names under the logos, timer and half in the middle. */
const bar = (id: string, name: string, background: string, names: string, accent: string): ScoreboardTemplate => ({
  id,
  name,
  layout: "bar",
  colors: { background, score: "#ffffff", names, timer: "#e8eaf0", accent },
});

export const SCOREBOARD_TEMPLATES: readonly ScoreboardTemplate[] = [
  // The original design: white clock tab, big score between the crests, over the background video.
  {
    id: "classic",
    name: "Classic",
    layout: "classic",
    colors: { background: null, score: "#ffffff", names: "#ffffff", timer: "#000000", accent: "#ffffff" },
  },
  bar("dark", "Dark", "#0a0c10", "#aab2cc", "#3d8bff"),
  bar("midnight", "Midnight", "#0f0a1a", "#c4b8e0", "#a855f7"),
  bar("forest", "Forest", "#061410", "#8fcfb8", "#00d26a"),
  bar("ember", "Ember", "#12080a", "#e0b8bc", "#e83a3a"),
  bar("gold", "Gold", "#100e04", "#d4c87a", "#eab308"),
  bar("steel", "Steel", "#0c111a", "#a8b8d0", "#22d3ee"),
];

/** The template with this id; Classic for an unknown id (e.g. one since removed). */
export function scoreboardTemplate(id: string): ScoreboardTemplate {
  return SCOREBOARD_TEMPLATES.find((t) => t.id === id) ?? SCOREBOARD_TEMPLATES[0];
}

/** A template with its default colours, as picked on the Graphics page. */
export function templateSettings(id: string): GraphicsSettings {
  const template = scoreboardTemplate(id);
  return { template: template.id, colors: { ...template.colors } };
}

export const DEFAULT_GRAPHICS: GraphicsSettings = templateSettings("classic");

export function sameGraphics(a: GraphicsSettings, b: GraphicsSettings): boolean {
  return (
    a.template === b.template &&
    (Object.keys(a.colors) as ScoreboardColorKey[]).every((key) => a.colors[key] === b.colors[key])
  );
}

/**
 * Other scenes' templates, picked on the scene's Graphics tab and stored on its scene
 * config. A scene not listed has one design. The first entry is the default.
 */
export const SCENE_TEMPLATES: Partial<Record<SceneType, readonly { id: string; name: string }[]>> = {
  welcome: [
    { id: "standard", name: "Card" },
    // Title and subtitle scrolling left to right across the whole screen, on repeat.
    { id: "largeText", name: "Large text" },
  ],
};

/** A valid template id for the scene: the given one if it exists, else the scene's default. */
export function sceneTemplateId(type: SceneType, id: unknown): string {
  const templates = SCENE_TEMPLATES[type];
  if (!templates) return "standard";
  return templates.find((t) => t.id === id)?.id ?? templates[0].id;
}
