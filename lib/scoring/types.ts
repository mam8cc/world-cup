import type { Stage } from "../feed";

export type PoolFormat = "predict_lock" | "sweepstake" | "survivor";

// Per-pool scoring configuration, stored as JSON on the pool. Defaults below.
export type Settings = {
  predictLock: {
    group1st: number;
    group2nd: number;
    champion: number;
    goldenBoot: number;
  };
  sweepstake: {
    win: number;
    draw: number;
    champion: number;
    stageBonus: Record<Exclude<Stage, "group" | "third">, number>;
  };
  survivor: {
    // A draw in the group stage eliminates (knockout always has a winner).
    drawEliminates: boolean;
  };
};

export const DEFAULT_SETTINGS: Settings = {
  predictLock: { group1st: 3, group2nd: 2, champion: 10, goldenBoot: 5 },
  sweepstake: {
    win: 3,
    draw: 1,
    champion: 12,
    stageBonus: { r32: 1, r16: 2, qf: 4, sf: 6, final: 8 },
  },
  survivor: { drawEliminates: true },
};

export type LeaderboardRow = {
  playerId: number;
  displayName: string;
  score: number;
  detail?: string; // human-readable breakdown / status
  rank: number;
};

export function rankRows(rows: Omit<LeaderboardRow, "rank">[]): LeaderboardRow[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  let rank = 0;
  let prev: number | null = null;
  return sorted.map((r, i) => {
    if (prev === null || r.score !== prev) rank = i + 1;
    prev = r.score;
    return { ...r, rank };
  });
}
