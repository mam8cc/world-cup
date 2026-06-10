import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import PredictForm from "@/app/components/PredictForm";
import SurvivorBoard from "@/app/components/SurvivorBoard";
import { getPlayerToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignments, predictions, survivorPicks } from "@/lib/db/schema";
import { getCurrentPlayer, getMatches, getPlayers, getPoolByCode, predictionsOpen } from "@/lib/pool";
import { withFlag } from "@/lib/flags";
import { orderForRound, pickerIndex, rounds } from "@/lib/survivor";
import { allTeams, groups, teamMatchOn, teamsPlayingOn } from "@/lib/tournament";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function PicksPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await getPoolByCode(code);
  if (!pool) notFound();
  const me = await getCurrentPlayer(pool.id, await getPlayerToken(code));
  if (!me) redirect(`/pool/${code}`);

  const matches = await getMatches();
  const players = await getPlayers(pool.id);

  return (
    <>
      <p className="small">
        <Link href={`/pool/${code}`}>← {pool.name}</Link>
      </p>
      <h1>Your picks</h1>

      <div className="panel">
        {pool.format === "predict_lock" && (
          <PredictForm
            code={code}
            groups={groups(matches)}
            allTeams={allTeams(matches)}
            existing={(await db.query.predictions.findMany({ where: eq(predictions.playerId, me.id) })).map((p) => ({
              kind: p.kind,
              slot: p.slot,
              team: p.team,
            }))}
            open={predictionsOpen(pool, matches)}
          />
        )}

        {pool.format === "sweepstake" && (await renderSweepstake(pool.id, me.id, me.isAdmin, code, matches))}

        {pool.format === "survivor" && (await renderSurvivor(pool.id, me.id, code, players, matches))}
      </div>
    </>
  );
}

async function renderSweepstake(
  poolId: number,
  meId: number,
  isAdmin: boolean,
  code: string,
  matches: Awaited<ReturnType<typeof getMatches>>,
) {
  const rows = await db.query.assignments.findMany({ where: eq(assignments.poolId, poolId) });
  if (rows.length === 0) {
    return (
      <div className="notice">
        The draw hasn’t happened yet. {isAdmin ? <>Run it from the <Link href={`/pool/${code}/admin`}>admin page</Link>.</> : "Your teams will appear here once the host runs the draw."}
      </div>
    );
  }
  const players = await getPlayers(poolId);
  const nameOf = new Map(players.map((p) => [p.id, p.displayName]));
  const byPlayer = new Map<number, string[]>();
  for (const r of rows) {
    if (!byPlayer.has(r.playerId)) byPlayer.set(r.playerId, []);
    byPlayer.get(r.playerId)!.push(r.team);
  }
  return (
    <>
      <p className="muted small">Teams were randomly assigned. They earn you points as they win and advance.</p>
      {[...byPlayer.entries()].map(([pid, teams]) => (
        <div key={pid} style={{ marginBottom: 12 }}>
          <strong>{nameOf.get(pid)}{pid === meId ? " (you)" : ""}</strong>
          <div className="teamlist" style={{ marginTop: 6 }}>
            {teams.map((t) => (
              <span key={t} className="teamchip">{withFlag(t)}</span>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

async function renderSurvivor(
  poolId: number,
  meId: number,
  code: string,
  players: Awaited<ReturnType<typeof getPlayers>>,
  matches: Awaited<ReturnType<typeof getMatches>>,
) {
  const allRounds = rounds(matches);
  const t = today();
  const current = allRounds.find((r) => r.date >= t) ?? null;

  const allPicks = await db.query.survivorPicks.findMany({ where: eq(survivorPicks.poolId, poolId) });
  const used = new Set(allPicks.map((p) => p.team));

  // Current-round state.
  let order: { id: number; name: string }[] = [];
  let pickerId: number | null = null;
  let available: string[] = [];
  let myPickThisRound: string | null = null;
  let pastDeadline = false;

  if (current) {
    const ordered = orderForRound(players, current.index);
    order = ordered.map((p) => ({ id: p.id, name: p.displayName }));
    const roundPicks = allPicks.filter((p) => p.pickDate === current.date);
    const pickedIds = new Set(roundPicks.map((p) => p.playerId));
    const turn = pickerIndex(ordered, pickedIds);
    pickerId = turn === null ? null : ordered[turn].id;
    available = teamsPlayingOn(matches, current.date).filter((tm) => !used.has(tm));
    myPickThisRound = roundPicks.find((p) => p.playerId === meId)?.team ?? null;
    pastDeadline = current.date < t;
  }

  // History (rounds that have picks), most recent first, with outcomes.
  const nameOf = new Map(players.map((p) => [p.id, p.displayName]));
  const datesWithPicks = [...new Set(allPicks.map((p) => p.pickDate))].sort().reverse();
  const history = datesWithPicks.map((date) => ({
    date,
    picks: allPicks
      .filter((p) => p.pickDate === date)
      .map((p) => {
        const m = teamMatchOn(matches, date, p.team);
        let outcome = "pending";
        if (m && m.status === "final") outcome = m.winner === p.team ? "survived" : "out";
        return { name: nameOf.get(p.playerId) ?? "?", team: p.team, outcome };
      }),
  }));

  return (
    <SurvivorBoard
      code={code}
      date={current?.date ?? null}
      order={order}
      pickerId={pickerId}
      meId={meId}
      available={available}
      myPickThisRound={myPickThisRound}
      pastDeadline={pastDeadline}
      history={history}
    />
  );
}
