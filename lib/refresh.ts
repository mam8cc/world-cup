import { sql } from "drizzle-orm";
import { db } from "./db";
import { matches as matchesTable, meta, teams as teamsTable } from "./db/schema";
import { parseFeed, topScorers, type RawFeed } from "./feed";
import { isRealTeam } from "./tournament";

const SEASON = process.env.WC_SEASON ?? "2026";

// Fetches the latest feed and upserts teams, matches and derived meta (golden-boot
// leaders). Idempotent — safe to run on every cron tick.
export async function refreshResults(season = SEASON): Promise<{ matches: number; teams: number }> {
  const url = `https://raw.githubusercontent.com/openfootball/worldcup.json/master/${season}/worldcup.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch feed for ${season}: ${res.status}`);
  const raw = (await res.json()) as RawFeed;
  const parsed = parseFeed(raw);

  // Teams come from the group stage (real names).
  const teamRows = new Map<string, { code: string; name: string; groupLetter: string | null }>();
  for (const m of parsed) {
    if (m.stage !== "group" || !m.group) continue;
    for (const name of [m.team1, m.team2]) {
      if (isRealTeam(name)) teamRows.set(name, { code: name, name, groupLetter: m.group });
    }
  }

  await db.transaction(async (tx) => {
    if (teamRows.size > 0) {
      await tx
        .insert(teamsTable)
        .values([...teamRows.values()])
        .onConflictDoUpdate({
          target: teamsTable.code,
          set: { name: sql`excluded.name`, groupLetter: sql`excluded.group_letter` },
        });
    }

    for (const m of parsed) {
      await tx
        .insert(matchesTable)
        .values({
          feedKey: m.feedKey,
          round: m.round,
          stage: m.stage,
          date: m.date,
          groupLetter: m.group,
          team1: m.team1,
          team2: m.team2,
          ft1: m.ft?.[0] ?? null,
          ft2: m.ft?.[1] ?? null,
          winner: m.winner,
          status: m.status,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: matchesTable.feedKey,
          set: {
            round: sql`excluded.round`,
            stage: sql`excluded.stage`,
            date: sql`excluded.date`,
            groupLetter: sql`excluded.group_letter`,
            team1: sql`excluded.team1`,
            team2: sql`excluded.team2`,
            ft1: sql`excluded.ft1`,
            ft2: sql`excluded.ft2`,
            winner: sql`excluded.winner`,
            status: sql`excluded.status`,
            updatedAt: new Date(),
          },
        });
    }

    const gb = topScorers(raw.matches);
    const topGoals = gb[0]?.goals ?? 0;
    const leaders = topGoals > 0 ? gb.filter((s) => s.goals === topGoals).map((s) => s.name) : [];
    await tx
      .insert(meta)
      .values({ key: "golden_boot", value: leaders })
      .onConflictDoUpdate({ target: meta.key, set: { value: leaders } });
  });

  return { matches: parsed.length, teams: teamRows.size };
}
