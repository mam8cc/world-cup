import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";
import { getAdminToken } from "@/lib/auth";
import { getPoolByCode } from "@/lib/pool";

// Remove a player from a pool. Cascades to their predictions / assignments / survivor picks.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await getPoolByCode(code);
  if (!pool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  if ((await getAdminToken(code)) !== pool.adminToken) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const playerId = Number(body.playerId);
  if (!Number.isInteger(playerId)) {
    return NextResponse.json({ error: "Invalid player." }, { status: 400 });
  }

  const target = await db.query.players.findFirst({
    where: and(eq(players.id, playerId), eq(players.poolId, pool.id)),
  });
  if (!target) return NextResponse.json({ error: "Player not found." }, { status: 404 });

  await db.delete(players).where(eq(players.id, playerId));
  return NextResponse.json({ ok: true, removed: target.displayName });
}
