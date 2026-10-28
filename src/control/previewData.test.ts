import { describe, expect, it } from "vitest";
import type { LiveData } from "@shared/liveFeed";
import { contentKey, thumbnailData } from "./previewData";
import { DEFAULT_GRAPHICS } from "@shared/themes";
import { createInitialMatchState, defaultSceneConfigs, type OnAirGraphics, type Player } from "@shared/types";

const photo = (n: number) => `data:image/png;base64,${"A".repeat(1000)}${n}`;
const a: Player = { id: "a", teamId: "h", name: "Ana A", photo: photo(1) };
const b: Player = { id: "b", teamId: "h", name: "Bo B", photo: photo(2) };

function liveData(): LiveData {
  const scenes = defaultSceneConfigs();
  scenes.welcome.background = photo(3);
  scenes.scoreboard.logo = photo(4);
  return {
    match: createInitialMatchState(),
    teams: { home: null, away: null },
    players: new Map([
      ["a", a],
      ["b", b],
    ]),
    squads: { home: [a, b], away: [] },
    lineups: { home: [b], away: [] },
    scenes,
    sponsors: [{ id: "s", name: "S", logo: photo(5), tier: "main", order: 0, hidden: false }],
    graphics: DEFAULT_GRAPHICS,
  };
}

const shownOf = (data: LiveData): OnAirGraphics => ({ graphics: data.graphics, scenes: data.scenes });

describe("thumbnailData", () => {
  it("keeps only the intro player's photo (first lineup player without a program player)", () => {
    const data = liveData();
    const t = thumbnailData(data, shownOf(data), "presentation");
    expect(t.players.get("b")!.photo).toBe(b.photo);
    expect(t.players.get("a")!.photo).toBeNull();
    expect(t.lineups.home[0].photo).toBe(b.photo);
    expect(t.squads.home[0].photo).toBeNull();
  });

  it("uses the program player when set, and no photos for other scenes", () => {
    const data = liveData();
    data.match.program = { ...data.match.program, playerId: "a" };
    expect(thumbnailData(data, shownOf(data), "playerCard").players.get("a")!.photo).toBe(a.photo);
    const board = thumbnailData(data, shownOf(data), "scoreboard");
    expect([...board.players.values()].every((p) => p.photo === null)).toBe(true);
    expect(board.players.get("a")!.name).toBe("Ana A");
  });

  it("keeps only the scene's own images and the sponsors for the sponsors scene", () => {
    const data = liveData();
    const welcome = thumbnailData(data, shownOf(data), "welcome");
    expect(welcome.scenes.welcome.background).toBe(data.scenes.welcome.background);
    expect(welcome.scenes.scoreboard.logo).toBeNull();
    expect(welcome.sponsors).toEqual([]);
    expect(thumbnailData(data, shownOf(data), "sponsors").sponsors).toHaveLength(1);
  });

  it("applies the shown look and scenes", () => {
    const data = liveData();
    const shown = { graphics: { ...DEFAULT_GRAPHICS, theme: "dark" as const }, scenes: { ...data.scenes, goal: { ...data.scenes.goal, title: "X" } } };
    const t = thumbnailData(data, shown, "goal");
    expect(t.graphics.theme).toBe("dark");
    expect(t.scenes.goal.title).toBe("X");
  });
});

describe("contentKey", () => {
  it("is equal for equal content and short for data URLs", () => {
    const data = liveData();
    expect(contentKey(thumbnailData(data, shownOf(data), "welcome"))).toBe(
      contentKey(thumbnailData(liveData(), shownOf(liveData()), "welcome")),
    );
    expect(contentKey({ p: photo(1) }).length).toBeLessThan(100);
    expect(contentKey({ p: photo(1) })).not.toBe(contentKey({ p: photo(2) }));
    expect(contentKey(new Map([["x", 1]]))).not.toBe(contentKey(new Map([["x", 2]])));
  });
});

describe("thumbnailData edge cases", () => {
  it("falls back to the first match player when the program player isn't loaded", () => {
    const data = liveData();
    data.match.program = { ...data.match.program, playerId: "gone" };
    const t = thumbnailData(data, shownOf(data), "presentation");
    expect(t.players.get("b")!.photo).toBe(b.photo);
    expect(t.players.get("a")!.photo).toBeNull();
  });

  it("uses the program side's players for an away intro, the whole squad without a lineup", () => {
    const data = liveData();
    const c: Player = { id: "c", teamId: "x", name: "Cy C", photo: photo(6) };
    data.players.set("c", c);
    data.squads.away = [c];
    data.match.program = { ...data.match.program, side: "away", playerId: null };
    const t = thumbnailData(data, shownOf(data), "presentation");
    expect(t.players.get("c")!.photo).toBe(c.photo);
    expect(t.players.get("b")!.photo).toBeNull();
  });

  it("keeps no players when there are none", () => {
    const data = liveData();
    data.players = new Map();
    data.squads = { home: [], away: [] };
    data.lineups = { home: [], away: [] };
    expect(thumbnailData(data, shownOf(data), "presentation").players.size).toBe(0);
  });

  it("doesn't change the caller's data", () => {
    const data = liveData();
    thumbnailData(data, shownOf(data), "scoreboard");
    expect(data.players.get("a")!.photo).toBe(a.photo);
    expect(data.squads.home[0].photo).toBe(a.photo);
    expect(data.scenes.welcome.background).toBe(photo(3));
    expect(data.sponsors).toHaveLength(1);
  });

  it("keeps hidden sponsors for the sponsors scene (the scene filters them)", () => {
    const data = liveData();
    data.sponsors = [...data.sponsors, { id: "h", name: "H", logo: photo(7), tier: "partner", order: 1, hidden: true }];
    expect(thumbnailData(data, shownOf(data), "sponsors").sponsors.map((s) => s.id)).toEqual(["s", "h"]);
  });
});

describe("contentKey edge cases", () => {
  it("keeps short strings whole and tells apart data URLs of the same length", () => {
    expect(contentKey("short")).toBe(JSON.stringify("short"));
    const x = `data:image/png;base64,${"A".repeat(500)}`;
    const y = `data:image/png;base64,${"B".repeat(500)}`;
    expect(contentKey(x)).not.toBe(contentKey(y));
  });
  it("is empty for undefined and stable for null", () => {
    expect(contentKey(undefined)).toBe("");
    expect(contentKey(null)).toBe("null");
  });
  it("tells apart Maps with different keys", () => {
    expect(contentKey(new Map([["x", 1]]))).not.toBe(contentKey(new Map([["y", 1]])));
  });
});
