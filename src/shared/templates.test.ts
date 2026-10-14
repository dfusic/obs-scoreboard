import { describe, expect, it } from "vitest";
import { normalizeGraphics, normalizeMatch, normalizeScenes } from "./normalize";
import {
  DEFAULT_GRAPHICS,
  sameGraphics,
  sceneTemplateId,
  SCOREBOARD_TEMPLATES,
  scoreboardTemplate,
  templateSettings,
} from "./templates";

describe("scoreboard templates", () => {
  it("has unique ids, with Classic (the original look) first", () => {
    const ids = SCOREBOARD_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("classic");
    expect(DEFAULT_GRAPHICS.template).toBe("classic");
  });

  it("falls back to Classic for an unknown id", () => {
    expect(scoreboardTemplate("gone").id).toBe("classic");
  });

  it("copies the template's colours", () => {
    const settings = templateSettings("ember");
    settings.colors.score = "#000000";
    expect(scoreboardTemplate("ember").colors.score).toBe("#ffffff");
  });

  it("compares settings by value", () => {
    expect(sameGraphics(templateSettings("dark"), templateSettings("dark"))).toBe(true);
    const changed = templateSettings("dark");
    changed.colors.accent = "#123456";
    expect(sameGraphics(templateSettings("dark"), changed)).toBe(false);
    expect(sameGraphics(templateSettings("dark"), templateSettings("steel"))).toBe(false);
  });
});

describe("normalizeGraphics", () => {
  it("defaults to Classic when never saved", () => {
    expect(normalizeGraphics(undefined)).toEqual(DEFAULT_GRAPHICS);
  });

  it("merges stored colours over the template's", () => {
    const g = normalizeGraphics({ template: "forest", colors: { accent: "#ff0000" } as never });
    expect(g.template).toBe("forest");
    expect(g.colors.accent).toBe("#ff0000");
    expect(g.colors.background).toBe(scoreboardTemplate("forest").colors.background);
  });

  it("keeps a null background (video) and drops invalid colours", () => {
    const g = normalizeGraphics({ template: "dark", colors: { background: null, score: "red" } as never });
    expect(g.colors.background).toBeNull();
    expect(g.colors.score).toBe("#ffffff");
  });

  it("maps an unknown template to Classic", () => {
    expect(normalizeGraphics({ template: "nope" } as never).template).toBe("classic");
  });
});

describe("normalizeMatch half", () => {
  it("defaults to the 1st half for older docs", () => {
    expect(normalizeMatch({}).half).toBe(1);
    expect(normalizeMatch({ half: 2 }).half).toBe(2);
    expect(normalizeMatch({ half: 3 as never }).half).toBe(1);
  });
});

describe("scene templates", () => {
  it("defaults Welcome to the card, and keeps a known template", () => {
    expect(normalizeScenes([]).welcome.template).toBe("standard");
    expect(normalizeScenes([["welcome", { template: "largeText" }]]).welcome.template).toBe("largeText");
  });

  it("falls back to the default for an unknown template or a scene without templates", () => {
    expect(sceneTemplateId("welcome", "gone")).toBe("standard");
    expect(sceneTemplateId("goal", "largeText")).toBe("standard");
  });
});
