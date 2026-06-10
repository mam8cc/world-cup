import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { survivorPicks } from "@/lib/db/schema";
import { getPlayerToken } from "@/lib/auth";
import { getCurrentPlayer, getMatches, getPlayers, getPoolByCode } from "@/lib/pool";
import { orderForRound, pickerIndex, rounds } from "@/lib/survivor";
import { isRealTeam, teamsPlayingOn } from "@/lib/tournament";

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
  const auto = body.auto === true;

  const matches = await getMatches();
  const round = rounds(matches).find((r) => r.date === date);
  if (!round) return NextResponse.json({ error: "Not a valid round." }, { status: 400 });
  if (date < today()) return NextResponse.json({ error: "That round's deadline has passed." }, { status: 403 });

  const players = await getPlayers(pool.id); // sorted by draftOrder
  const order = orderForRound(players, round.index);
  const roundPicks = await db.query.survivorPicks.findMany({
    where: and(eq(survivorPicks.poolId, pool.id), eq(survivorPicks.pickDate, date)),
  });
  const pickedIds = new Set(roundPicks.map((p) => p.playerId));
  const turn = pickerIndex(order, pickedIds);
  if (turn === null) return NextResponse.json({ error: "Everyone has picked this round." }, { status: 409 });
  const currentPicker = order[turn];

  // Whoever submits must be the player whose turn it is — unless auto-filling a missed turn.
  if (!auto && currentPicker.id !== me.id) {
    return NextResponse.json({ error: `It's ${currentPicker.displayName}'s turn.` }, { status: 409 });
  }

  // Teams already used anywhere in this pool are unavailable (exclusive across the pool).
  const allPicks = await db.query.survivorPicks.findMany({ where: eq(survivorPicks.poolId, pool.id) });
  const used = new Set(allPicks.map((p) => p.team));
  const available = teamsPlayingOn(matches, date).filter((t) => !used.has(t));
  if (available.length === 0) {
    return NextResponse.json({ error: "No available teams play this round." }, { status: 409 });
  }

  let team: string;
  if (auto) {
    team = available[0]; // deterministic auto-pick to keep the draft from stalling
  } else {
    team = typeof body.team === "string" ? body.team : "";
    if (!isRealTeam(team) || !available.includes(team)) {
      return NextResponse.json({ error: "Pick a team that plays today and isn't taken." }, { status: 400 });
    }
  }

  try {
    await db.insert(survivorPicks).values({
      poolId: pool.id,
      playerId: currentPicker.id,
      pickDate: date,
      team,
    });
  } catch {
    // Unique constraints (one pick per player per round, team once per pool) raced us.
    return NextResponse.json({ error: "That pick was just taken — refresh." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, team, player: currentPicker.displayName });
}
