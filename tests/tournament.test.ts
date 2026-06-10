import { beforeAll, describe, expect, it } from "vitest";
import { parseFeed, type Match } from "../lib/feed";
import { scorePredictLock, type PlayerPredictions, type Prediction } from "../lib/scoring/predictLock";
import { scoreSweepstake, type PlayerAssignments } from "../lib/scoring/sweepstake";
import { scoreSurvivor, type PlayerSurvivor } from "../lib/scoring/survivor";
import { DEFAULT_SETTINGS } from "../lib/scoring/types";
import { buildTournament, type BuiltTournament } from "./fixtures/tournament";

const T: BuiltTournament = buildTournament();
const FULL: Match[] = parseFeed(T.feed);
const LETTERS = Object.keys(T.groups);

// Re-create the match set "as of" a given day: anything after the cutoff is not-yet-played.
// This lets the tests walk the tournament forward and watch standings evolve.
function asOf(cutoff: string): Match[] {
  return FULL.map((m) =>
    m.date <= cutoff ? m : { ...m, ft: null, et: null, pens: null, status: "scheduled" as const, winner: null },
  );
}

const rankOf = (name: string, board: { displayName: string; rank: number }[]) =>
  board.find((r) => r.displayName === name)!.rank;
const scoreOf = (name: string, board: { displayName: string; score: number }[]) =>
  board.find((r) => r.displayName === name)!.score;

beforeAll(() => {
  expect(FULL).toHaveLength(104);
  expect(T.champion).toBe("Argentina");
});

describe("Predict & Lock — full tournament", () => {
  const g1 = (L: string): Prediction => ({ kind: "group_1st", slot: L, team: T.groupOrder[L][0] });
  const g2 = (L: string): Prediction => ({ kind: "group_2nd", slot: L, team: T.groupOrder[L][1] });

  const players: PlayerPredictions[] = [
    {
      playerId: 1,
      displayName: "Oracle", // every group pick + champion correct
      predictions: [
        ...LETTERS.flatMap((L) => [g1(L), g2(L)]),
        { kind: "champion", slot: "champion", team: T.champion },
      ],
    },
    {
      playerId: 2,
      displayName: "GroupGuru", // group winners + champion correct, no runner-up picks
      predictions: [...LETTERS.map(g1), { kind: "champion", slot: "champion", team: T.champion }],
    },
    {
      playerId: 3,
      displayName: "Wrongo", // every pick wrong (predicts the bottom two of each group, weak champion)
      predictions: [
        ...LETTERS.flatMap((L) => [
          { kind: "group_1st", slot: L, team: T.groupOrder[L][3] } as Prediction,
          { kind: "group_2nd", slot: L, team: T.groupOrder[L][2] } as Prediction,
        ]),
        { kind: "champion", slot: "champion", team: T.ranking[T.ranking.length - 1] },
      ],
    },
  ];

  it("Oracle leads after the group stage", () => {
    const board = scorePredictLock(players, asOf("2026-06-13"), DEFAULT_SETTINGS);
    expect(rankOf("Oracle", board)).toBe(1);
    expect(scoreOf("Oracle", board)).toBe(12 * (3 + 2)); // 60 — champion not decided yet
    expect(scoreOf("GroupGuru", board)).toBe(12 * 3); // 36
    expect(scoreOf("Wrongo", board)).toBe(0);
  });

  it("champion points land only after the final is played", () => {
    expect(scoreOf("Oracle", scorePredictLock(players, asOf("2026-06-17"), DEFAULT_SETTINGS))).toBe(60);
    expect(scoreOf("Oracle", scorePredictLock(players, asOf("2026-06-18"), DEFAULT_SETTINGS))).toBe(70);
  });

  it("Oracle wins the tournament", () => {
    const board = scorePredictLock(players, FULL, DEFAULT_SETTINGS);
    expect(board[0].displayName).toBe("Oracle");
    expect(rankOf("Oracle", board)).toBe(1);
    expect(scoreOf("Oracle", board)).toBe(70);
    expect(scoreOf("GroupGuru", board)).toBe(46);
    expect(scoreOf("Wrongo", board)).toBe(0);
  });
});

describe("Sweepstake — full tournament", () => {
  // Deterministic (not random) assignment: strongest 16 to P1, next 16 to P2, weakest 16 to P3.
  const players: PlayerAssignments[] = [
    { playerId: 1, displayName: "TopHeavy", teams: T.ranking.slice(0, 16) },
    { playerId: 2, displayName: "MidPack", teams: T.ranking.slice(16, 32) },
    { playerId: 3, displayName: "LongShots", teams: T.ranking.slice(32, 48) },
  ];

  it("the champion's owner leads from the group stage onward", () => {
    const afterGroups = scoreSweepstake(players, asOf("2026-06-13"), DEFAULT_SETTINGS);
    expect(rankOf("TopHeavy", afterGroups)).toBe(1);
  });

  it("TopHeavy (owns the champion) wins, ahead of MidPack and LongShots", () => {
    const board = scoreSweepstake(players, FULL, DEFAULT_SETTINGS);
    expect(board[0].displayName).toBe("TopHeavy");
    expect(rankOf("TopHeavy", board)).toBe(1);
    expect(scoreOf("TopHeavy", board)).toBeGreaterThan(scoreOf("MidPack", board));
    expect(scoreOf("MidPack", board)).toBeGreaterThan(scoreOf("LongShots", board));
  });
});

describe("Survivor — full tournament", () => {
  // Build picks against the real results, honoring team-once-per-pool exclusivity.
  const used = new Set<string>();
  const take = (pool: string[]): string => {
    const t = pool.find((x) => !used.has(x));
    if (!t) throw new Error("no available team");
    used.add(t);
    return t;
  };
  const D = T.dates;

  // Last-standing player: back a winner every day. Claim scarce late-day winners first.
  const survivorPicks: { date: string; team: string }[] = [];
  for (const d of [...D].reverse()) survivorPicks.push({ date: d, team: take(T.byDate[d].winners) });
  survivorPicks.sort((a, b) => a.date.localeCompare(b.date));

  // Eliminated on day 4 (the Round of 32): winners for three days, then a loser.
  const midPicks = [
    { date: D[0], team: take(T.byDate[D[0]].winners) },
    { date: D[1], team: take(T.byDate[D[1]].winners) },
    { date: D[2], team: take(T.byDate[D[2]].winners) },
    { date: D[3], team: take(T.byDate[D[3]].losers) },
  ];

  // Eliminated on day 1: backs a loser immediately.
  const earlyPicks = [{ date: D[0], team: take(T.byDate[D[0]].losers) }];

  const players: PlayerSurvivor[] = [
    { playerId: 1, displayName: "LastStanding", picks: survivorPicks },
    { playerId: 2, displayName: "MidOut", picks: midPicks },
    { playerId: 3, displayName: "EarlyOut", picks: earlyPicks },
  ];

  it("eliminates the early backer on day 1, others survive", () => {
    const board = scoreSurvivor(players, asOf(D[0]), DEFAULT_SETTINGS);
    expect(board.find((r) => r.displayName === "EarlyOut")!.detail).toContain("Out");
    expect(board.find((r) => r.displayName === "LastStanding")!.detail).toContain("Alive");
    expect(board.find((r) => r.displayName === "MidOut")!.detail).toContain("Alive");
  });

  it("eliminates the mid backer in the Round of 32", () => {
    const board = scoreSurvivor(players, asOf(D[3]), DEFAULT_SETTINGS);
    expect(board.find((r) => r.displayName === "MidOut")!.detail).toBe(`Out (${D[3]})`);
    expect(board.find((r) => r.displayName === "LastStanding")!.detail).toContain("Alive");
  });

  it("LastStanding wins — alone alive at the final", () => {
    const board = scoreSurvivor(players, FULL, DEFAULT_SETTINGS);
    expect(board[0].displayName).toBe("LastStanding");
    expect(rankOf("LastStanding", board)).toBe(1);
    expect(board.find((r) => r.displayName === "LastStanding")!.detail).toBe(`Alive · ${D.length} rounds`);
    expect(board.filter((r) => r.detail?.startsWith("Out"))).toHaveLength(2);
  });
});
