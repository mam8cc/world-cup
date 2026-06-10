import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assignments, pools } from "@/lib/db/schema";
import { getAdminToken } from "@/lib/auth";
import { getMatches, getPlayers, getPoolByCode } from "@/lib/pool";
import { allTeams } from "@/lib/tournament";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await getPoolByCode(code);
  if (!pool || pool.format !== "sweepstake") {
    return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  }
  const adminToken = await getAdminToken(code);
  if (adminToken !== pool.adminToken) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const existing = await db.query.assignments.findFirst({ where: eq(assignments.poolId, pool.id) });
  if (existing) return NextResponse.json({ error: "Draw already done." }, { status: 409 });

  const players = await getPlayers(pool.id);
  if (players.length === 0) return NextResponse.json({ error: "No players to draw for." }, { status: 400 });

  const teams = shuffle(allTeams(await getMatches()));
  if (teams.length === 0) return NextResponse.json({ error: "No teams available yet." }, { status: 400 });

  // Snake distribution so team counts stay balanced and any remainder is spread fairly.
  const rows: { poolId: number; playerId: number; team: string }[] = [];
  let idx = 0;
  let forward = true;
  for (const team of teams) {
    rows.push({ poolId: pool.id, playerId: players[idx].id, team });
    if (forward) {
      if (idx === players.length - 1) forward = false;
      else idx++;
    } else {
      if (idx === 0) forward = true;
      else idx--;
    }
  }

  await db.transaction(async (tx) => {
    await tx.insert(assignments).values(rows);
    await tx.update(pools).set({ status: "locked" }).where(eq(pools.id, pool.id));
  });

  return NextResponse.json({ ok: true, assigned: rows.length });
}
