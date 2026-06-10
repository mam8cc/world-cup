import { asc, eq } from "drizzle-orm";
import { db } from "./db";
import { matches as matchesTable, meta, players, pools } from "./db/schema";
import type { Match, Stage } from "./feed";
import type { Pool, Player, MatchRow } from "./db/schema";

export async function getPoolByCode(code: string): Promise<Pool | undefined> {
  return db.query.pools.findFirst({ where: eq(pools.joinCode, code) });
}

export async function getPlayers(poolId: number): Promise<Player[]> {
  return db.query.players.findMany({
    where: eq(players.poolId, poolId),
    orderBy: [asc(players.draftOrder), asc(players.id)],
  });
}

export async function getCurrentPlayer(poolId: number, token: string | null): Promise<Player | null> {
  if (!token) return null;
  const player = await db.query.players.findFirst({ where: eq(players.playerToken, token) });
  return player && player.poolId === poolId ? player : null;
}

export function rowToMatch(r: MatchRow): Match {
  const ft = r.ft1 !== null && r.ft2 !== null ? ([r.ft1, r.ft2] as [number, number]) : null;
  return {
    feedKey: r.feedKey,
    round: r.round,
    stage: r.stage as Stage,
    date: r.date,
    group: r.groupLetter,
    team1: r.team1,
    team2: r.team2,
    ft,
    et: null,
    pens: null,
    status: r.status,
    winner: r.winner,
  };
}

export async function getMatches(): Promise<Match[]> {
  const rows = await db.query.matches.findMany({ orderBy: [asc(matchesTable.date), asc(matchesTable.feedKey)] });
  return rows.map(rowToMatch);
}

// Predict & lock picks close at the first kickoff (or when an admin locks).
export function firstKickoff(matches: Match[]): string | null {
  const dates = matches.map((m) => m.date).sort();
  return dates[0] ?? null;
}

export function predictionsOpen(pool: Pool, matches: Match[]): boolean {
  if (pool.status !== "setup") return false;
  const first = firstKickoff(matches);
  if (!first) return true;
  // Compare by date (kickoff times vary); picks lock at the start of opening day.
  const today = new Date().toISOString().slice(0, 10);
  return today < first;
}

// Whether one player may view another's picks. Predict & lock stays hidden until picks
// lock (so nobody copies); sweepstake teams are public once drawn; survivor picks are
// public as the draft happens.
export function picksVisible(pool: Pool, matches: Match[]): boolean {
  if (pool.format === "predict_lock") return !predictionsOpen(pool, matches);
  if (pool.format === "sweepstake") return pool.status === "locked";
  return true; // survivor
}

export async function getGoldenBootWinners(): Promise<string[]> {
  const row = await db.query.meta.findFirst({ where: eq(meta.key, "golden_boot") });
  return (row?.value as string[] | undefined) ?? [];
}
