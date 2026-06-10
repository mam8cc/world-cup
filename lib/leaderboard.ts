import { eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { assignments, meta, predictions, survivorPicks } from "./db/schema";
import type { Match } from "./feed";
import type { Pool, Player } from "./db/schema";
import { scorePredictLock, type PlayerPredictions, type Prediction } from "./scoring/predictLock";
import { scoreSweepstake } from "./scoring/sweepstake";
import { scoreSurvivor } from "./scoring/survivor";
import type { LeaderboardRow } from "./scoring/types";

async function goldenBootWinners(): Promise<string[]> {
  const row = await db.query.meta.findFirst({ where: eq(meta.key, "golden_boot") });
  return (row?.value as string[] | undefined) ?? [];
}

export async function computeLeaderboard(
  pool: Pool,
  players: Player[],
  matches: Match[],
): Promise<LeaderboardRow[]> {
  if (players.length === 0) return [];
  const ids = players.map((p) => p.id);

  if (pool.format === "predict_lock") {
    const rows = await db.query.predictions.findMany({ where: inArray(predictions.playerId, ids) });
    const byPlayer = new Map<number, Prediction[]>();
    for (const r of rows) {
      if (!byPlayer.has(r.playerId)) byPlayer.set(r.playerId, []);
      byPlayer.get(r.playerId)!.push({ kind: r.kind, slot: r.slot, team: r.team });
    }
    const input: PlayerPredictions[] = players.map((p) => ({
      playerId: p.id,
      displayName: p.displayName,
      predictions: byPlayer.get(p.id) ?? [],
    }));
    return scorePredictLock(input, matches, pool.settings, await goldenBootWinners());
  }

  if (pool.format === "sweepstake") {
    const rows = await db.query.assignments.findMany({ where: eq(assignments.poolId, pool.id) });
    const byPlayer = new Map<number, string[]>();
    for (const r of rows) {
      if (!byPlayer.has(r.playerId)) byPlayer.set(r.playerId, []);
      byPlayer.get(r.playerId)!.push(r.team);
    }
    const input = players.map((p) => ({
      playerId: p.id,
      displayName: p.displayName,
      teams: byPlayer.get(p.id) ?? [],
    }));
    return scoreSweepstake(input, matches, pool.settings);
  }

  // survivor
  const rows = await db.query.survivorPicks.findMany({ where: eq(survivorPicks.poolId, pool.id) });
  const byPlayer = new Map<number, { date: string; team: string }[]>();
  for (const r of rows) {
    if (!byPlayer.has(r.playerId)) byPlayer.set(r.playerId, []);
    byPlayer.get(r.playerId)!.push({ date: r.pickDate, team: r.team });
  }
  const input = players.map((p) => ({
    playerId: p.id,
    displayName: p.displayName,
    picks: byPlayer.get(p.id) ?? [],
  }));
  return scoreSurvivor(input, matches, pool.settings);
}
