import { DEFAULT_TRANSITION } from "./transitions";
import type { GraphicsSettings, SceneType, SchemeColors } from "./types";

/**
 * Themes and colour schemes, both global: they apply to every scene.
 *
 * A theme is the design of every scene (the scoreboard's layout, and the look of the
 * others through `body[data-theme]` in overlay.css). A colour scheme is a set of colours
 * that works with any theme. Each theme starts with its own default scheme; the operator
 * can pick another scheme or change single colours on the Graphics page.
 *
 * To add a theme, add an entry to THEMES and THEME_COLORS (its scoreboard also needs
 * markup in overlay/scenes.tsx, a ThemeThumb and CSS); to add a scheme, add it to
 * COLOR_SCHEMES.
 */
export type ThemeId = "classic" | "semafor" | "dark";

export interface Theme {
  id: ThemeId;
  name: string;
  /** The COLOR_SCHEMES id the theme starts with. */
  scheme: string;
}

export interface ColorScheme {
  id: string;
  name: string;
  colors: SchemeColors;
}

export type SchemeColorKey = keyof SchemeColors;

/** The colours each theme uses, in editor order, with what they colour there. */
export const THEME_COLORS: Record<ThemeId, { key: SchemeColorKey; label: string }[]> = {
  classic: [
    { key: "background", label: "Background" },
    { key: "score", label: "Score" },
    { key: "accent", label: "Clock panel" },
    { key: "timer", label: "Clock digits" },
    { key: "highlight", label: "Scene titles" },
  ],
  semafor: [
    { key: "background", label: "Background" },
    { key: "accent", label: "Stripes" },
    { key: "score", label: "Score" },
    { key: "names", label: "Names / scorers" },
    { key: "timer", label: "Timer" },
    { key: "highlight", label: "Scene titles" },
  ],
  dark: [
    { key: "background", label: "Background" },
    { key: "score", label: "Score" },
    { key: "names", label: "Team names" },
    { key: "timer", label: "Timer" },
    { key: "accent", label: "Accent / half" },
    { key: "highlight", label: "Scene titles" },
  ],
};

/** A dark scheme: solid background, white score, tinted names, one accent colour. */
const dark = (id: string, name: string, background: string, names: string, accent: string): ColorScheme => ({
  id,
  name,
  colors: { background, score: "#ffffff", names, timer: "#e8eaf0", accent, highlight: accent },
});

export const COLOR_SCHEMES: readonly ColorScheme[] = [
  // The original look: white over the background video, black clock digits, gold titles.
  {
    id: "classic",
    name: "Classic",
    colors: {
      background: null,
      score: "#ffffff",
      names: "#ffffff",
      timer: "#000000",
      accent: "#ffffff",
      highlight: "#e8c547",
    },
  },
  // Red with black stripes.
  {
    id: "semafor",
    name: "Semafor",
    colors: {
      background: "#d41228",
      score: "#ffffff",
      names: "#ffffff",
      timer: "#ffffff",
      accent: "#000000",
      highlight: "#ff2d44",
    },
  },
  dark("dark", "Dark", "#0a0c10", "#aab2cc", "#3d8bff"),
  dark("midnight", "Midnight", "#0f0a1a", "#c4b8e0", "#a855f7"),
  dark("forest", "Forest", "#061410", "#8fcfb8", "#00d26a"),
  dark("ember", "Ember", "#12080a", "#e0b8bc", "#e83a3a"),
  dark("gold", "Gold", "#100e04", "#d4c87a", "#eab308"),
  dark("steel", "Steel", "#0c111a", "#a8b8d0", "#22d3ee"),
];

export const THEMES: readonly Theme[] = [
  // The original design: white clock tab, big score between the crests, over the background video.
  { id: "classic", name: "Classic", scheme: "classic" },
  // Slowly moving stripes, everything on a blurred dark panel.
  { id: "semafor", name: "Semafor", scheme: "semafor" },
  // Crest, score and name per side, timer and half in the middle.
  { id: "dark", name: "Dark", scheme: "dark" },
];

/**
 * Scoreboard template ids from before themes and colour schemes were split. Each was the
 * Dark design in the scheme of the same name. Kept so saved settings still load.
 */
const LEGACY_THEMES: Record<string, ThemeId> = {
  midnight: "dark",
  forest: "dark",
  ember: "dark",
  gold: "dark",
  steel: "dark",
};

/** The theme with this id (or the one a legacy template id became); Classic for an unknown id. */
export function theme(id: string): Theme {
  const current = LEGACY_THEMES[id] ?? id;
  return THEMES.find((t) => t.id === current) ?? THEMES[0];
}

/** The colour scheme with this id, if there is one. */
export function colorScheme(id: string): ColorScheme | undefined {
  return COLOR_SCHEMES.find((s) => s.id === id);
}

/** A copy of the theme's default colours. */
export function themeColors(t: Theme): SchemeColors {
  return { ...(colorScheme(t.scheme) ?? COLOR_SCHEMES[0]).colors };
}

/** A theme with its default colours (and the default transition). */
export function themeSettings(id: string): GraphicsSettings {
  const t = theme(id);
  return { theme: t.id, colors: themeColors(t), transition: DEFAULT_TRANSITION };
}

export const DEFAULT_GRAPHICS: GraphicsSettings = themeSettings("classic");

export function sameColors(a: SchemeColors, b: SchemeColors): boolean {
  return (Object.keys(a) as SchemeColorKey[]).every((key) => a[key]?.toLowerCase() === b[key]?.toLowerCase());
}

/** The scheme these colours match, or undefined once they've been customised. */
export function matchingScheme(colors: SchemeColors): ColorScheme | undefined {
  return COLOR_SCHEMES.find((s) => sameColors(s.colors, colors));
}

export function sameGraphics(a: GraphicsSettings, b: GraphicsSettings): boolean {
  return a.theme === b.theme && sameColors(a.colors, b.colors) && a.transition === b.transition;
}

/**
 * Scenes with more than one layout within the theme, picked on the scene's Graphics tab
 * and stored on its scene config. A scene not listed has one layout. The first entry is
 * the default.
 */
export const SCENE_LAYOUTS: Partial<Record<SceneType, readonly { id: string; name: string }[]>> = {
  welcome: [
    { id: "standard", name: "Card" },
    // Title and subtitle scrolling right to left across the whole screen, on repeat.
    { id: "largeText", name: "Large text" },
  ],
  sponsors: [
    // Every sponsor at once: main sponsors larger on top, partners in rows below.
    { id: "grid", name: "Grid" },
    // One large logo and name at a time, rotating (see sponsorSlide in sponsors.ts).
    { id: "single", name: "One at a time" },
  ],
};

/** A valid layout id for the scene: the given one if it exists, else the scene's default. */
export function sceneLayoutId(type: SceneType, id: unknown): string {
  const layouts = SCENE_LAYOUTS[type];
  if (!layouts) return "standard";
  return layouts.find((l) => l.id === id)?.id ?? layouts[0].id;
}
