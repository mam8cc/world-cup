import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseFeed, topScorers, type RawFeed } from "../lib/feed";
import { computeStandings, groupRunnerUp, groupWinner } from "../lib/standings";
import { champion, allTeams } from "../lib/tournament";
import { scorePredictLock } from "../lib/scoring/predictLock";
import { scoreSweepstake } from "../lib/scoring/sweepstake";
import { scoreSurvivor } from "../lib/scoring/survivor";
import { DEFAULT_SETTINGS } from "../lib/scoring/types";

const raw = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "worldcup-2022.json"), "utf8"),
) as RawFeed;
const matches = parseFeed(raw);

describe("feed + standings", () => {
  it("parses all matches", () => {
    expect(matches).toHaveLength(64);
  });

  it("computes Group A final standings", () => {
    const standings = computeStandings(matches);
    expect(standings.A.map((r) => r.team)).toEqual(["Netherlands", "Senegal", "Ecuador", "Qatar"]);
    expect(groupWinner(standings, "A")).toBe("Netherlands");
    expect(groupRunnerUp(standings, "A")).toBe("Senegal");
    expect(standings.A[0].points).toBe(7);
  });

  it("identifies the champion from the final", () => {
    expect(champion(matches)).toBe("Argentina");
  });

  it("derives 32 teams from the group stage", () => {
    expect(allTeams(matches)).toHaveLength(32);
  });

  it("ranks top scorers from the dataset's goal data", () => {
    expect(topScorers(raw.matches)[0]).toEqual({ name: "Lionel Messi", goals: 7 });
  });
});

describe("predict & lock scoring", () => {
  it("awards points for correct group, champion and golden-boot picks", () => {
    const gb = topScorers(raw.matches).slice(0, 1).map((s) => s.name); // ["Lionel Messi"]
    const board = scorePredictLock(
      [
        {
          playerId: 1,
          displayName: "Ada",
          predictions: [
            { kind: "group_1st", slot: "A", team: "Netherlands" },
            { kind: "group_2nd", slot: "A", team: "Senegal" },
            { kind: "champion", slot: "champion", team: "Argentina" },
            { kind: "golden_boot", slot: "golden_boot", team: "Lionel Messi" },
          ],
        },
        {
          playerId: 2,
          displayName: "Boris",
          predictions: [
            { kind: "group_1st", slot: "A", team: "Qatar" },
            { kind: "champion", slot: "champion", team: "France" },
          ],
        },
      ],
      matches,
      DEFAULT_SETTINGS,
      gb,
    );
    const ada = board.find((r) => r.playerId === 1)!;
    const boris = board.find((r) => r.playerId === 2)!;
    expect(ada.score).toBe(3 + 2 + 10 + 5);
    expect(ada.rank).toBe(1);
    expect(boris.score).toBe(0);
  });
});

describe("sweepstake scoring", () => {
  it("ranks the champion's owner above an eliminated team's owner", () => {
    const board = scoreSweepstake(
      [
        { playerId: 1, displayName: "Ada", teams: ["Argentina"] },
        { playerId: 2, displayName: "Boris", teams: ["Qatar"] },
      ],
      matches,
      DEFAULT_SETTINGS,
    );
    const ada = board.find((r) => r.playerId === 1)!;
    const boris = board.find((r) => r.playerId === 2)!;
    expect(ada.score).toBeGreaterThan(boris.score);
    expect(ada.rank).toBe(1);
    // Argentina: champion bonus is included.
    expect(ada.score).toBeGreaterThan(DEFAULT_SETTINGS.sweepstake.champion);
    // Qatar lost all three group games.
    expect(boris.score).toBe(0);
  });
});

describe("survivor scoring", () => {
  it("keeps a winning backer alive and eliminates a losing backer", () => {
    // 2022-11-21: Senegal 0-2 Netherlands.
    const board = scoreSurvivor(
      [
        { playerId: 1, displayName: "Ada", picks: [{ date: "2022-11-21", team: "Netherlands" }] },
        { playerId: 2, displayName: "Boris", picks: [{ date: "2022-11-21", team: "Senegal" }] },
      ],
      matches,
      DEFAULT_SETTINGS,
    );
    const ada = board.find((r) => r.playerId === 1)!;
    const boris = board.find((r) => r.playerId === 2)!;
    expect(ada.rank).toBe(1);
    expect(ada.detail).toContain("Alive");
    expect(boris.detail).toContain("Out");
    expect(ada.score).toBeGreaterThan(boris.score);
  });

  it("eliminates on a group-stage draw when configured", () => {
    // 2022-11-25: Netherlands 1-1 Ecuador (a draw).
    const board = scoreSurvivor(
      [{ playerId: 1, displayName: "Ada", picks: [{ date: "2022-11-25", team: "Ecuador" }] }],
      matches,
      DEFAULT_SETTINGS,
    );
    expect(board[0].detail).toContain("Out");
  });
});
