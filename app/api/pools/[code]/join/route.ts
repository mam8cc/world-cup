import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";
import { getAdminToken, getPlayerToken, setPlayerToken } from "@/lib/auth";
import { getPlayers, getPoolByCode } from "@/lib/pool";
import { secretToken } from "@/lib/tokens";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await getPoolByCode(code);
  if (!pool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });

  // Already joined in this browser?
  const existingToken = await getPlayerToken(code);
  if (existingToken) {
    const p = await db.query.players.findFirst({ where: eq(players.playerToken, existingToken) });
    if (p && p.poolId === pool.id) return NextResponse.json({ ok: true });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Enter a display name." }, { status: 400 });

  const all = await getPlayers(pool.id);
  if (all.some((p) => p.displayName.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "That name is already taken in this pool." }, { status: 409 });
  }

  const adminToken = await getAdminToken(code);
  const isAdmin = adminToken !== null && adminToken === pool.adminToken;
  const playerToken = secretToken();
  await db.insert(players).values({
    poolId: pool.id,
    displayName: name,
    playerToken,
    draftOrder: all.length + 1,
    isAdmin,
  });
  await setPlayerToken(code, playerToken);
  return NextResponse.json({ ok: true });
}
