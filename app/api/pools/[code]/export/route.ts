import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { assignments, predictions, survivorPicks } from "@/lib/db/schema";
import { getAdminToken, getPlayerToken } from "@/lib/auth";
import { getCurrentPlayer, getMatches, getPlayers, getPoolByCode, picksVisible } from "@/lib/pool";
import { groups } from "@/lib/tournament";
import type { Match } from "@/lib/feed";
import type { Player, Pool } from "@/lib/db/schema";

function cell(value: string | number): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: (string | number)[][]): string {
  // Prepend a BOM so Excel reads UTF-8 (e.g. "Côte" / "Curaçao") correctly.
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await getPoolByCode(code);
  if (!pool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });

  const isAdmin = (await getAdminToken(code)) === pool.adminToken;
  const me = await getCurrentPlayer(pool.id, await getPlayerToken(code));
  if (!me && !isAdmin) return NextResponse.json({ error: "Join the pool first." }, { status: 401 });

  const matches = await getMatches();
  if (!isAdmin && !picksVisible(pool, matches)) {
    return NextResponse.json({ error: "Picks are private until the pool locks." }, { status: 403 });
  }

  const players = await getPlayers(pool.id);
  const rows = await buildRows(pool, players, matches);

  const slug = (pool.name || code).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${slug || code}-picks.csv"`,
    },
  });
}

async function buildRows(pool: Pool, players: Player[], matches: Match[]): Promise<(string | number)[][]> {
  const ids = players.map((p) => p.id);

  if (pool.format === "predict_lock") {
    const letters = Object.keys(groups(matches)).sort();
    const preds = ids.length
      ? await db.query.predictions.findMany({ where: inArray(predictions.playerId, ids) })
      : [];
    const key = (pid: number, kind: string, slot: string) =>
      preds.find((p) => p.playerId === pid && p.kind === kind && p.slot === slot)?.team ?? "";

    const header = ["Player"];
    for (const L of letters) header.push(`Group ${L} 1st`, `Group ${L} 2nd`);
    header.push("Champion", "Golden Boot");

    const body = players.map((p) => {
      const row: (string | number)[] = [p.displayName];
      for (const L of letters) row.push(key(p.id, "group_1st", L), key(p.id, "group_2nd", L));
      row.push(key(p.id, "champion", "champion"), key(p.id, "golden_boot", "golden_boot"));
      return row;
    });
    return [header, ...body];
  }

  if (pool.format === "sweepstake") {
    const rows = ids.length
      ? await db.query.assignments.findMany({ where: eq(assignments.poolId, pool.id) })
      : [];
    const out: (string | number)[][] = [["Player", "Team"]];
    for (const p of players) {
      const teams = rows.filter((r) => r.playerId === p.id).map((r) => r.team).sort();
      if (teams.length === 0) out.push([p.displayName, ""]);
      for (const t of teams) out.push([p.displayName, t]);
    }
    return out;
  }

  // survivor — one column per round (date), plus a status column.
  const picks = ids.length
    ? await db.query.survivorPicks.findMany({ where: eq(survivorPicks.poolId, pool.id) })
    : [];
  const dates = [...new Set(picks.map((p) => p.pickDate))].sort();
  const header = ["Player", ...dates, "Status"];
  const body = players.map((p) => {
    const mine = picks.filter((x) => x.playerId === p.id).sort((a, b) => a.pickDate.localeCompare(b.pickDate));
    let out = false;
    for (const pick of mine) {
      const m = matches.find((x) => x.date === pick.pickDate && (x.team1 === pick.team || x.team2 === pick.team));
      if (m && m.status === "final" && m.winner !== pick.team) {
        out = true;
        break;
      }
    }
    const row: (string | number)[] = [p.displayName];
    for (const d of dates) row.push(mine.find((x) => x.pickDate === d)?.team ?? "");
    row.push(out ? "Out" : "Alive");
    return row;
  });
  return [header, ...body];
}
