import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { predictions } from "@/lib/db/schema";
import { getPlayerToken } from "@/lib/auth";
import { getCurrentPlayer, getMatches, getPoolByCode, predictionsOpen } from "@/lib/pool";

const KINDS = new Set(["group_1st", "group_2nd", "champion", "golden_boot"]);

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await getPoolByCode(code);
  if (!pool || pool.format !== "predict_lock") {
    return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  }
  const me = await getCurrentPlayer(pool.id, await getPlayerToken(code));
  if (!me) return NextResponse.json({ error: "Join the pool first." }, { status: 401 });

  const matches = await getMatches();
  if (!predictionsOpen(pool, matches)) {
    return NextResponse.json({ error: "Picks are locked." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const picks = Array.isArray(body.picks) ? body.picks : [];
  if (picks.length > 50) return NextResponse.json({ error: "Too many picks." }, { status: 400 });

  const clean = picks
    .filter(
      (p: unknown): p is { kind: string; slot: string; team: string } =>
        !!p &&
        typeof (p as { kind?: unknown }).kind === "string" &&
        KINDS.has((p as { kind: string }).kind) &&
        typeof (p as { slot?: unknown }).slot === "string" &&
        typeof (p as { team?: unknown }).team === "string" &&
        (p as { team: string }).team.trim().length > 0,
    )
    .map((p: { kind: string; slot: string; team: string }) => ({
      playerId: me.id,
      kind: p.kind as "group_1st" | "group_2nd" | "champion" | "golden_boot",
      slot: p.slot,
      team: p.team.trim(),
    }));

  await db.transaction(async (tx) => {
    await tx.delete(predictions).where(eq(predictions.playerId, me.id));
    if (clean.length > 0) await tx.insert(predictions).values(clean);
  });

  return NextResponse.json({ ok: true, saved: clean.length });
}
