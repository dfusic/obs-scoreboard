import { describe, expect, it } from "vitest";
import { normalizeSponsor, normalizeTeam } from "./normalize";
import { compareRecentlyEdited, playerStatDeltas, squadStats, staleTeamStats } from "./squad";

const players = [{ photo: "data:image/png;base64,a" }, { photo: null }, { photo: null }];

describe("squadStats", () => {
  it("counts players and those without a photo", () => {
    expect(squadStats(players)).toEqual({ playerCount: 3, missingPhotos: 2 });
    expect(squadStats([])).toEqual({ playerCount: 0, missingPhotos: 0 });
  });
});

describe("staleTeamStats", () => {
  it("repairs teams saved before the counts (null) and drifted counts", () => {
    expect(staleTeamStats({ playerCount: null, missingPhotos: null }, players)).toEqual({ playerCount: 3, missingPhotos: 2 });
    expect(staleTeamStats({ playerCount: 3, missingPhotos: 1 }, players)).toEqual({ playerCount: 3, missingPhotos: 2 });
    expect(staleTeamStats({ playerCount: 3, missingPhotos: 2 }, players)).toBeNull();
  });
});

describe("normalizeTeam counts", () => {
  it("reads missing counts and timestamp as null", () => {
    const team = normalizeTeam("t", { name: "Old" });
    expect(team.playerCount).toBeNull();
    expect(team.missingPhotos).toBeNull();
    expect(team.updatedAtMs).toBeNull();
    expect(normalizeTeam("t", { playerCount: 4, missingPhotos: 0 }).playerCount).toBe(4);
  });
});

describe("compareRecentlyEdited", () => {
  it("puts the newest first and unstamped teams last by name", () => {
    const teams = [
      normalizeTeam("a", { name: "B" }),
      normalizeTeam("b", { name: "A" }),
      normalizeTeam("c", { name: "C", updatedAtMs: 10 }),
      normalizeTeam("d", { name: "D", updatedAtMs: 20 }),
    ];
    expect(teams.sort(compareRecentlyEdited).map((t) => t.id)).toEqual(["d", "c", "b", "a"]);
  });
});

describe("playerStatDeltas", () => {
  const withPhoto = { teamId: "a", photo: "data:x" };
  const noPhoto = { teamId: "a", photo: null };
  it("counts a create and a delete", () => {
    expect(playerStatDeltas(null, noPhoto)).toEqual([{ teamId: "a", playerCount: 1, missingPhotos: 1 }]);
    expect(playerStatDeltas(null, withPhoto)).toEqual([{ teamId: "a", playerCount: 1, missingPhotos: 0 }]);
    expect(playerStatDeltas(withPhoto, null)).toEqual([{ teamId: "a", playerCount: -1, missingPhotos: 0 }]);
    expect(playerStatDeltas(noPhoto, null)).toEqual([{ teamId: "a", playerCount: -1, missingPhotos: -1 }]);
  });
  it("follows a photo being added or removed", () => {
    expect(playerStatDeltas(noPhoto, withPhoto)).toEqual([{ teamId: "a", playerCount: 0, missingPhotos: -1 }]);
    expect(playerStatDeltas(withPhoto, noPhoto)).toEqual([{ teamId: "a", playerCount: 0, missingPhotos: 1 }]);
  });
  it("moves the counts on a team change", () => {
    expect(playerStatDeltas(noPhoto, { teamId: "b", photo: "data:x" })).toEqual([
      { teamId: "a", playerCount: -1, missingPhotos: -1 },
      { teamId: "b", playerCount: 1, missingPhotos: 0 },
    ]);
  });
  it("is empty for a no-op (e.g. a rename) and for players without a team", () => {
    expect(playerStatDeltas(withPhoto, { ...withPhoto })).toEqual([]);
    expect(playerStatDeltas(null, { teamId: "", photo: null })).toEqual([]);
  });
});

describe("normalizeTeam garbage counts", () => {
  it("clamps negatives to 0 and reads non-numbers as null", () => {
    const team = normalizeTeam("t", { playerCount: -2, missingPhotos: Number.NaN, updatedAtMs: "x" as never });
    expect(team.playerCount).toBe(0);
    expect(team.missingPhotos).toBeNull();
    expect(team.updatedAtMs).toBeNull();
    expect(normalizeTeam("t", { playerCount: "3" as never }).playerCount).toBeNull();
  });
});

describe("normalizeSponsor hidden", () => {
  it("defaults to shown for docs saved before the field", () => {
    expect(normalizeSponsor("s", { name: "Old", tier: "main", order: 1 }).hidden).toBe(false);
    expect(normalizeSponsor("s", { hidden: "yes" as never }).hidden).toBe(false);
    expect(normalizeSponsor("s", { hidden: true }).hidden).toBe(true);
  });
});

describe("playerStatDeltas edge cases", () => {
  it("is empty when both sides are missing", () => {
    expect(playerStatDeltas(null, null)).toEqual([]);
  });
  it("counts only the side with a team when a player gains or loses one", () => {
    expect(playerStatDeltas({ teamId: "", photo: null }, { teamId: "a", photo: null })).toEqual([
      { teamId: "a", playerCount: 1, missingPhotos: 1 },
    ]);
    expect(playerStatDeltas({ teamId: "a", photo: "data:x" }, { teamId: "", photo: "data:x" })).toEqual([
      { teamId: "a", playerCount: -1, missingPhotos: 0 },
    ]);
  });
  it("moves a missing photo between teams on a team change with the photo still missing", () => {
    expect(playerStatDeltas({ teamId: "a", photo: null }, { teamId: "b", photo: null })).toEqual([
      { teamId: "a", playerCount: -1, missingPhotos: -1 },
      { teamId: "b", playerCount: 1, missingPhotos: 1 },
    ]);
  });
  it("treats an empty photo string as missing", () => {
    expect(playerStatDeltas(null, { teamId: "a", photo: "" })).toEqual([{ teamId: "a", playerCount: 1, missingPhotos: 1 }]);
  });
  it("sums to the stats of the resulting squad over a sequence of writes", () => {
    type Member = { teamId: string; photo: string | null };
    let stats = { playerCount: 0, missingPhotos: 0 };
    const apply = (before: Member | null, after: Member | null) => {
      for (const d of playerStatDeltas(before, after)) {
        if (d.teamId !== "a") continue;
        stats = { playerCount: stats.playerCount + d.playerCount, missingPhotos: stats.missingPhotos + d.missingPhotos };
      }
    };
    const p1: Member = { teamId: "a", photo: null };
    const p2: Member = { teamId: "a", photo: "data:y" };
    const p3: Member = { teamId: "a", photo: null };
    apply(null, p1);
    apply(null, p2);
    apply(null, p3);
    apply(p1, { teamId: "a", photo: "data:x" }); // p1 gets a photo
    apply(p2, { teamId: "a", photo: null }); // p2 loses its photo
    apply({ teamId: "a", photo: null }, { teamId: "b", photo: null }); // p2 moves away
    apply(p3, null); // p3 deleted
    expect(stats).toEqual(squadStats([{ photo: "data:x" }]));
  });
});

describe("staleTeamStats edge cases", () => {
  it("repairs an empty squad whose team still counts players, and accepts a correct empty one", () => {
    expect(staleTeamStats({ playerCount: 2, missingPhotos: 1 }, [])).toEqual({ playerCount: 0, missingPhotos: 0 });
    expect(staleTeamStats({ playerCount: 0, missingPhotos: 0 }, [])).toBeNull();
    expect(staleTeamStats({ playerCount: null, missingPhotos: null }, [])).toEqual({ playerCount: 0, missingPhotos: 0 });
  });
  it("repairs when only one of the counts is null", () => {
    expect(staleTeamStats({ playerCount: 3, missingPhotos: null }, players)).toEqual({ playerCount: 3, missingPhotos: 2 });
  });
});

describe("compareRecentlyEdited edge cases", () => {
  it("sorts equal timestamps by name and puts a 0 stamp before unstamped teams", () => {
    const teams = [
      normalizeTeam("x", { name: "Zeta", updatedAtMs: 5 }),
      normalizeTeam("y", { name: "Alpha", updatedAtMs: 5 }),
      normalizeTeam("z", { name: "Never" }),
      normalizeTeam("w", { name: "Epoch", updatedAtMs: 0 }),
    ];
    expect(teams.sort(compareRecentlyEdited).map((t) => t.id)).toEqual(["y", "x", "w", "z"]);
  });
});
