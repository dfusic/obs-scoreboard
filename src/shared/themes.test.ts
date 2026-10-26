import { describe, expect, it } from "vitest";
import { normalizeGraphics, normalizeMatch, normalizeScenes } from "./normalize";
import {
  COLOR_SCHEMES,
  colorScheme,
  DEFAULT_GRAPHICS,
  matchingScheme,
  sameGraphics,
  sceneLayoutId,
  theme,
  THEME_COLORS,
  THEMES,
  themeSettings,
} from "./themes";

describe("themes", () => {
  it("are Classic (the original look, default), Semafor and Dark, each with an existing scheme", () => {
    expect(THEMES.map((t) => t.id)).toEqual(["classic", "semafor", "dark"]);
    expect(DEFAULT_GRAPHICS.theme).toBe("classic");
    for (const t of THEMES) expect(colorScheme(t.scheme)).toBeDefined();
  });

  it("let every theme edit the scenes' highlight", () => {
    for (const t of THEMES) expect(THEME_COLORS[t.id].some((c) => c.key === "highlight")).toBe(true);
  });

  it("fall back to Classic for an unknown id, and map old colour-variant templates to Dark", () => {
    expect(theme("gone").id).toBe("classic");
    expect(theme("ember").id).toBe("dark");
  });

  it("copy the scheme's colours", () => {
    const settings = themeSettings("dark");
    settings.colors.score = "#000000";
    expect(colorScheme("dark")?.colors.score).toBe("#ffffff");
  });

  it("compare settings by value", () => {
    expect(sameGraphics(themeSettings("dark"), themeSettings("dark"))).toBe(true);
    const changed = themeSettings("dark");
    changed.colors.highlight = "#123456";
    expect(sameGraphics(themeSettings("dark"), changed)).toBe(false);
    expect(sameGraphics(themeSettings("dark"), { theme: "semafor", colors: themeSettings("dark").colors })).toBe(false);
  });
});

describe("colour schemes", () => {
  it("have unique ids", () => {
    const ids = COLOR_SCHEMES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("are found from their colours, case-insensitively, and not once customised", () => {
    const colors = { ...colorScheme("forest")!.colors, accent: "#00D26A" };
    expect(matchingScheme(colors)?.id).toBe("forest");
    expect(matchingScheme({ ...colors, accent: "#123456" })).toBeUndefined();
  });
});

describe("normalizeGraphics", () => {
  it("defaults to Classic when never saved", () => {
    expect(normalizeGraphics(undefined)).toEqual(DEFAULT_GRAPHICS);
  });

  it("merges stored colours over the theme's", () => {
    const g = normalizeGraphics({ theme: "semafor", colors: { accent: "#ff0000" } as never });
    expect(g.theme).toBe("semafor");
    expect(g.colors.accent).toBe("#ff0000");
    expect(g.colors.background).toBe(colorScheme("semafor")?.colors.background);
  });

  it("keeps a null background (video) and drops invalid colours", () => {
    const g = normalizeGraphics({ theme: "dark", colors: { background: null, score: "red" } as never });
    expect(g.colors.background).toBeNull();
    expect(g.colors.score).toBe("#ffffff");
  });

  it("maps an unknown theme to Classic", () => {
    expect(normalizeGraphics({ theme: "nope" } as never).theme).toBe("classic");
  });

  it("reads settings saved before themes (`template`, no highlight)", () => {
    const { highlight, ...oldForest } = colorScheme("forest")!.colors;
    const g = normalizeGraphics({ template: "forest", colors: oldForest } as never);
    expect(g.theme).toBe("dark");
    expect(g.colors).toEqual(colorScheme("forest")!.colors);
    expect(highlight).toBe(g.colors.highlight);

    const { highlight: _, ...oldClassic } = colorScheme("classic")!.colors;
    expect(normalizeGraphics({ template: "classic", colors: oldClassic } as never)).toEqual(DEFAULT_GRAPHICS);
  });

  it("takes the theme's highlight for old custom colours", () => {
    const g = normalizeGraphics({ template: "dark", colors: { accent: "#123456" } } as never);
    expect(g.colors.highlight).toBe(colorScheme("dark")?.colors.highlight);
  });
});

describe("normalizeMatch half", () => {
  it("defaults to the 1st half for older docs", () => {
    expect(normalizeMatch({}).half).toBe(1);
    expect(normalizeMatch({ half: 2 }).half).toBe(2);
    expect(normalizeMatch({ half: 3 as never }).half).toBe(1);
  });
});

describe("scene layouts", () => {
  it("default Welcome to the card, and keep a known layout", () => {
    expect(normalizeScenes([]).welcome.layout).toBe("standard");
    expect(normalizeScenes([["welcome", { layout: "largeText" }]]).welcome.layout).toBe("largeText");
  });

  it("read the layout saved as `template` before themes, without keeping that field", () => {
    const welcome = normalizeScenes([["welcome", { template: "largeText" }]]).welcome;
    expect(welcome.layout).toBe("largeText");
    expect("template" in welcome).toBe(false);
  });

  it("fall back to the default for an unknown layout or a scene without layouts", () => {
    expect(sceneLayoutId("welcome", "gone")).toBe("standard");
    expect(sceneLayoutId("goal", "largeText")).toBe("standard");
  });
});
