import { describe, expect, it } from "vitest";
import {
  applyDraft,
  cleanPatch,
  diffDraft,
  draftChanges,
  draftPatch,
  DRAFT_DOC_IDS,
  GRAPHICS_DRAFT_ID,
  isEmptyDraft,
  isEmptyPatch,
  samePatch,
  sceneDraftId,
  summarizeDraft,
} from "./graphicsDraft";
import { normalizeDraft, normalizeGraphics, normalizeScenes } from "./normalize";
import { DEFAULT_GRAPHICS, themeSettings } from "./themes";
import { EMPTY_DRAFT, SCENE_TYPES, defaultSceneConfigs, type GraphicsDraft, type OnAirGraphics } from "./types";

const onAir = (): OnAirGraphics => ({ graphics: structuredClone(DEFAULT_GRAPHICS), scenes: defaultSceneConfigs() });

describe("applyDraft / diffDraft", () => {
  it("round-trips an edit into a minimal patch", () => {
    const base = onAir();
    const shown = applyDraft(base, { graphics: { theme: "dark" }, scenes: { welcome: { title: "Hi" } } });
    expect(shown.graphics.theme).toBe("dark");
    expect(shown.scenes.welcome.title).toBe("Hi");
    expect(diffDraft(base, shown)).toEqual({ graphics: { theme: "dark" }, scenes: { welcome: { title: "Hi" } } });
  });

  it("applies patches in order, later wins, without touching on air", () => {
    const base = onAir();
    const shown = applyDraft(base, { graphics: {}, scenes: { goal: { title: "A" } } }, { graphics: {}, scenes: { goal: { title: "B" } } });
    expect(shown.scenes.goal.title).toBe("B");
    expect(base.scenes.goal.title).toBe("Goal!");
  });

  it("empties the patch when a field is edited back to its on-air value", () => {
    const base = onAir();
    const draft: GraphicsDraft = { graphics: { transition: "cut" }, scenes: { welcome: { title: "Hi" } } };
    const shown = applyDraft(base, draft, { graphics: { transition: base.graphics.transition }, scenes: { welcome: { title: "Welcome" } } });
    const next = diffDraft(base, shown);
    expect(next).toEqual(EMPTY_DRAFT);
    expect(isEmptyDraft(next)).toBe(true);
  });

  it("keeps colours whole", () => {
    const base = onAir();
    const colors = { ...base.graphics.colors, score: "#123456" };
    const diff = diffDraft(base, applyDraft(base, { graphics: { colors }, scenes: {} }));
    expect(diff.graphics.colors).toEqual(colors);
    expect(Object.keys(diff.graphics.colors!).sort()).toEqual(Object.keys(base.graphics.colors).sort());
  });

  it("ignores colour case differences", () => {
    const base = onAir();
    const colors = { ...base.graphics.colors, highlight: base.graphics.colors.highlight.toUpperCase() };
    expect(diffDraft(base, applyDraft(base, { graphics: { colors }, scenes: {} })).graphics).toEqual({});
  });
});

describe("draftChanges", () => {
  it("doesn't count a stale patch (on air already has the value)", () => {
    const base = onAir();
    base.scenes.welcome.title = "Hi";
    base.graphics = themeSettings("dark");
    const stale: GraphicsDraft = { graphics: { theme: "dark" }, scenes: { welcome: { title: "Hi" } } };
    expect(isEmptyDraft(draftChanges(base, stale))).toBe(true);
  });

  it("counts clearing an image (null) as a change", () => {
    const base = onAir();
    base.scenes.welcome.background = "data:image/jpeg;base64,xx";
    const changes = draftChanges(base, { graphics: {}, scenes: { welcome: { background: null } } });
    expect(changes.scenes.welcome).toEqual({ background: null });
  });

  it("works over on-air data from before themes (template fields)", () => {
    const base: OnAirGraphics = {
      graphics: normalizeGraphics({ template: "forest" }),
      scenes: normalizeScenes([["welcome", { template: "largeText" } as never]]),
    };
    expect(base.graphics.theme).toBe("dark");
    expect(base.scenes.welcome.layout).toBe("largeText");
    const draft: GraphicsDraft = { graphics: { theme: "dark" }, scenes: { welcome: { layout: "largeText" } } };
    expect(isEmptyDraft(draftChanges(base, draft))).toBe(true);
    expect(draftChanges(base, { graphics: {}, scenes: { welcome: { layout: "standard" } } }).scenes).toEqual({
      welcome: { layout: "standard" },
    });
  });
});

describe("samePatch", () => {
  it("compares fields and colour sets by value", () => {
    const colors = { ...DEFAULT_GRAPHICS.colors };
    expect(samePatch({ theme: "dark", colors }, { colors: { ...colors }, theme: "dark" })).toBe(true);
    expect(samePatch({ theme: "dark" }, { theme: "semafor" })).toBe(false);
    expect(samePatch({ title: "A" }, { title: "A", subtitle: "" })).toBe(false);
    expect(samePatch({}, undefined)).toBe(true);
    expect(samePatch({ title: undefined }, {})).toBe(true);
    expect(samePatch({ background: null }, {})).toBe(false);
    expect(samePatch({ colors }, { colors: { ...colors, score: "#000000" } })).toBe(false);
  });
});

describe("summarizeDraft", () => {
  it("lists global fields then scenes, capped", () => {
    const changes: GraphicsDraft = {
      graphics: { theme: "dark", transition: "cut" },
      scenes: { welcome: { title: "x" }, goal: { title: "y" }, sponsors: { secondsPerSponsor: 9 } },
    };
    expect(summarizeDraft(changes)).toBe("Theme, Transition, Welcome and 2 more");
    expect(summarizeDraft(changes, (t) => t, 10)).toBe("Theme, Transition, welcome, goal, sponsors");
    expect(summarizeDraft(EMPTY_DRAFT)).toBe("");
  });
});

describe("normalizeDraft", () => {
  it("keeps valid fields and drops the rest", () => {
    const draft = normalizeDraft([
      ["graphics", { theme: "nope", transition: "cut", colors: { score: "#fff" } }],
      ["scene-welcome", { title: "Hi", background: null, layout: "bogus", accentColor: "#000000", extra: 1 }],
      ["scene-sponsors", { secondsPerSponsor: 999, logo: 5 }],
      ["scene-unknown", { title: "x" }],
      ["other", { theme: "dark" }],
    ]);
    expect(draft.graphics).toEqual({ transition: "cut" });
    expect(draft.scenes.welcome).toEqual({ title: "Hi", background: null, layout: "standard" });
    expect(draft.scenes.sponsors).toEqual({ secondsPerSponsor: 60 });
    expect(Object.keys(draft.scenes)).toEqual(["welcome", "sponsors"]);
  });

  it("accepts a whole colour set with a null background", () => {
    const colors = { ...DEFAULT_GRAPHICS.colors, background: null };
    expect(normalizeDraft([["graphics", { theme: "semafor", colors }]]).graphics).toEqual({ theme: "semafor", colors });
  });
});

describe("applyDraft edge cases", () => {
  it("ignores undefined fields in a patch instead of erasing on-air values", () => {
    const base = onAir();
    const shown = applyDraft(base, { graphics: { theme: undefined, colors: undefined }, scenes: { welcome: { title: undefined } } });
    expect(shown.graphics).toEqual(base.graphics);
    expect(shown.scenes.welcome.title).toBe(base.scenes.welcome.title);
  });

  it("returns colours that can be changed without touching on air or the patch", () => {
    const base = onAir();
    const colors = { ...base.graphics.colors, score: "#abcdef" };
    const shown = applyDraft(base, { graphics: { colors }, scenes: {} });
    shown.graphics.colors.score = "#000000";
    expect(colors.score).toBe("#abcdef");
    expect(applyDraft(base).graphics.colors).not.toBe(base.graphics.colors);
    expect(base.graphics.colors.score).toBe(DEFAULT_GRAPHICS.colors.score);
  });

  it("is on air unchanged with no patches or an empty draft", () => {
    const base = onAir();
    expect(applyDraft(base)).toEqual(base);
    expect(applyDraft(base, EMPTY_DRAFT)).toEqual(base);
    expect(diffDraft(base, applyDraft(base, EMPTY_DRAFT))).toEqual(EMPTY_DRAFT);
  });

  it("lets a later patch clear an image set by an earlier one", () => {
    const base = onAir();
    const shown = applyDraft(
      base,
      { graphics: {}, scenes: { welcome: { background: "data:image/jpeg;base64,x" } } },
      { graphics: {}, scenes: { welcome: { background: null } } },
    );
    expect(shown.scenes.welcome.background).toBeNull();
    expect(diffDraft(base, shown)).toEqual(EMPTY_DRAFT);
  });
});

describe("diffDraft edge cases", () => {
  it("covers every scene field the draft can hold", () => {
    const base = onAir();
    const patch = {
      title: "T",
      subtitle: "S",
      background: "data:image/jpeg;base64,b",
      logo: "data:image/png;base64,l",
      layout: "single",
      secondsPerSponsor: 9,
    };
    const shown = applyDraft(base, { graphics: {}, scenes: { sponsors: patch } });
    expect(diffDraft(base, shown).scenes).toEqual({ sponsors: patch });
  });

  it("doesn't diff the unused accentColor", () => {
    const base = onAir();
    const shown = applyDraft(base);
    shown.scenes.goal = { ...shown.scenes.goal, accentColor: "#ff0000" };
    expect(diffDraft(base, shown)).toEqual(EMPTY_DRAFT);
  });
});

describe("draftChanges edge cases", () => {
  it("keeps the live part of a partly stale patch", () => {
    const base = onAir();
    base.scenes.welcome.title = "Hi";
    const changes = draftChanges(base, {
      graphics: { transition: base.graphics.transition },
      scenes: { welcome: { title: "Hi", subtitle: "New" } },
    });
    expect(changes).toEqual({ graphics: {}, scenes: { welcome: { subtitle: "New" } } });
  });

  it("drops stale colours that only differ in case", () => {
    const base = onAir();
    const colors = Object.fromEntries(
      Object.entries(base.graphics.colors).map(([k, v]) => [k, typeof v === "string" ? v.toUpperCase() : v]),
    ) as typeof base.graphics.colors;
    expect(isEmptyDraft(draftChanges(base, { graphics: { colors }, scenes: {} }))).toBe(true);
  });
});

describe("isEmptyPatch / isEmptyDraft", () => {
  it("treats missing, empty and all-undefined patches as empty, and null or '' as a value", () => {
    expect(isEmptyPatch(undefined)).toBe(true);
    expect(isEmptyPatch({})).toBe(true);
    expect(isEmptyPatch({ title: undefined, layout: undefined })).toBe(true);
    expect(isEmptyPatch({ background: null })).toBe(false);
    expect(isEmptyPatch({ title: "" })).toBe(false);
    expect(isEmptyDraft({ graphics: { theme: undefined }, scenes: { welcome: {}, goal: { title: undefined } } })).toBe(true);
    expect(isEmptyDraft({ graphics: {}, scenes: { lineup: { subtitle: "" } } })).toBe(false);
  });
});

describe("cleanPatch", () => {
  it("drops undefined and keeps null without changing the input", () => {
    const patch = { title: undefined, background: null, subtitle: "x" };
    expect(cleanPatch(patch)).toEqual({ background: null, subtitle: "x" });
    expect("title" in cleanPatch(patch)).toBe(false);
    expect("title" in patch).toBe(true);
  });
});

describe("draftPatch and doc ids", () => {
  it("has one unique doc id for the look and one per scene", () => {
    expect(DRAFT_DOC_IDS).toHaveLength(SCENE_TYPES.length + 1);
    expect(new Set(DRAFT_DOC_IDS).size).toBe(DRAFT_DOC_IDS.length);
    expect(DRAFT_DOC_IDS[0]).toBe(GRAPHICS_DRAFT_ID);
    expect(sceneDraftId("playerCard")).toBe("scene-playerCard");
  });

  it("finds the patch for each doc id, undefined for unknown ids", () => {
    const draft: GraphicsDraft = { graphics: { theme: "dark" }, scenes: { goal: { title: "G" } } };
    expect(draftPatch(draft, GRAPHICS_DRAFT_ID)).toEqual({ theme: "dark" });
    expect(draftPatch(draft, "scene-goal")).toEqual({ title: "G" });
    expect(draftPatch(draft, "scene-welcome")).toBeUndefined();
    expect(draftPatch(draft, "scene-nope")).toBeUndefined();
    expect(draftPatch(draft, "goal")).toBeUndefined();
  });

  it("round-trips every doc of a draft through normalizeDraft", () => {
    const draft: GraphicsDraft = {
      graphics: { theme: "semafor", transition: "cut", colors: { ...DEFAULT_GRAPHICS.colors } },
      scenes: { welcome: { title: "W", layout: "largeText" }, sponsors: { secondsPerSponsor: 10, layout: "single" } },
    };
    const docs: [string, Record<string, unknown> | undefined][] = DRAFT_DOC_IDS.map((id) => [
      id,
      draftPatch(draft, id) as Record<string, unknown> | undefined,
    ]);
    expect(normalizeDraft(docs)).toEqual(draft);
  });
});

describe("samePatch edge cases", () => {
  it("doesn't confuse null with a colour set or with an empty string", () => {
    const colors = { ...DEFAULT_GRAPHICS.colors };
    expect(samePatch({ colors }, { colors: null as never })).toBe(false);
    expect(samePatch({ background: null }, { background: "" })).toBe(false);
    expect(samePatch({ background: null }, { background: null })).toBe(true);
    expect(samePatch({ secondsPerSponsor: 6 }, { secondsPerSponsor: 6 })).toBe(true);
  });

  it("compares a colour set with a null background", () => {
    const colors = { ...DEFAULT_GRAPHICS.colors, background: null };
    expect(samePatch({ colors }, { colors: { ...colors } })).toBe(true);
    expect(samePatch({ colors }, { colors: { ...colors, background: "#000000" } })).toBe(false);
  });
});

describe("summarizeDraft edge cases", () => {
  it("names Colours and doesn't add 'more' at exactly the cap", () => {
    const changes: GraphicsDraft = {
      graphics: { colors: { ...DEFAULT_GRAPHICS.colors } },
      scenes: { scoreboard: { logo: null }, sponsors: { layout: "single" } },
    };
    expect(summarizeDraft(changes)).toBe("Colours, Scoreboard, Sponsors");
  });

  it("follows scene order, skips empty scene patches and counts the rest with a custom cap", () => {
    const changes: GraphicsDraft = {
      graphics: {},
      scenes: { sponsors: { title: "s" }, welcome: {}, goal: { title: undefined }, scoreboard: { title: "x" } },
    };
    expect(summarizeDraft(changes)).toBe("Scoreboard, Sponsors");
    expect(summarizeDraft(changes, undefined, 1)).toBe("Scoreboard and 1 more");
  });

  it("names a single change on its own", () => {
    expect(summarizeDraft({ graphics: { theme: "dark" }, scenes: {} })).toBe("Theme");
  });
});
