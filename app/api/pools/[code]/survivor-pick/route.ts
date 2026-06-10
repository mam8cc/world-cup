import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { survivorPicks } from "@/lib/db/schema";
import { getPlayerToken } from "@/lib/auth";
import { getCurrentPlayer, getMatches, getPoolByCode } from "@/lib/pool";
import { rounds, teamsPlayingInRound } from "@/lib/survivor";
import { isRealTeam } from "@/lib/tournament";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await getPoolByCode(code);
  if (!pool || pool.format !== "survivor") {
    return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  }
  const me = await getCurrentPlayer(pool.id, await getPlayerToken(code));
  if (!me) return NextResponse.json({ error: "Join the pool first." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const date = typeof body.date === "string" ? body.date : "";

  const matches = await getMatches();
  const round = rounds(matches).find((r) => r.date === date);
  if (!round) return NextResponse.json({ error: "Not a valid round." }, { status: 400 });
  if (date < today()) return NextResponse.json({ error: "That round's deadline has passed." }, { status: 403 });

  const available = teamsPlayingInRound(matches, date);
  if (available.length === 0) {
    return NextResponse.json({ error: "No available teams play this round." }, { status: 409 });
  }

  const team = typeof body.team === "string" ? body.team : "";
  if (!isRealTeam(team) || !available.includes(team)) {
    return NextResponse.json({ error: "Pick a team that plays this round." }, { status: 400 });
  }

  try {
    await db.insert(survivorPicks).values({
      poolId: pool.id,
      playerId: me.id,
      pickDate: date,
      team,
    });
  } catch {
    // The one-pick-per-player-per-round constraint raced us.
    return NextResponse.json({ error: "You already picked this round — refresh." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, team, player: me.displayName });
}
