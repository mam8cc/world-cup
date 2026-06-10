import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { getAdminToken } from "@/lib/auth";
import { getPoolByCode } from "@/lib/pool";

// Manual result entry — a fallback if the upstream feed lags behind real life.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await getPoolByCode(code);
  if (!pool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  if ((await getAdminToken(code)) !== pool.adminToken) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const feedKey = typeof body.feedKey === "string" ? body.feedKey : "";
  const ft1 = Number(body.ft1);
  const ft2 = Number(body.ft2);
  if (!feedKey || !Number.isInteger(ft1) || !Number.isInteger(ft2) || ft1 < 0 || ft2 < 0) {
    return NextResponse.json({ error: "Enter a match and a valid score." }, { status: 400 });
  }

  const match = await db.query.matches.findFirst({ where: eq(matches.feedKey, feedKey) });
  if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 });

  const winner = ft1 > ft2 ? match.team1 : ft2 > ft1 ? match.team2 : null;
  await db
    .update(matches)
    .set({ ft1, ft2, winner, status: "final", updatedAt: new Date() })
    .where(eq(matches.feedKey, feedKey));

  return NextResponse.json({ ok: true });
}
