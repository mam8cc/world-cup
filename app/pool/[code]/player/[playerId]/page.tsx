import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getPlayerToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignments, players, predictions, survivorPicks } from "@/lib/db/schema";
import { withFlag } from "@/lib/flags";
import { getCurrentPlayer, getGoldenBootWinners, getMatches, getPoolByCode, picksVisible } from "@/lib/pool";
import { computeStandings, groupRunnerUp, groupWinner } from "@/lib/standings";
import { champion, teamMatchOn } from "@/lib/tournament";
import { teamScores } from "@/lib/scoring/sweepstake";
import type { Match } from "@/lib/feed";
import type { Player, Pool } from "@/lib/db/schema";

export default async function PlayerDetail({
  params,
}: {
  params: Promise<{ code: string; playerId: string }>;
}) {
  const { code, playerId } = await params;
  const pool = await getPoolByCode(code);
  if (!pool) notFound();

  // Viewable without joining (e.g. you lost your session) — picks themselves stay gated below.
  const me = await getCurrentPlayer(pool.id, await getPlayerToken(code));

  const target = await db.query.players.findFirst({
    where: and(eq(players.id, Number(playerId)), eq(players.poolId, pool.id)),
  });
  if (!target) notFound();

  const matches = await getMatches();
  const isMe = !!me && target.id === me.id;
  // Predict & lock picks stay private until they lock — you can always see your own.
  if (!isMe && !picksVisible(pool, matches)) {
    return (
      <>
        <Back code={code} name={pool.name} />
        <h1>{target.displayName}</h1>
        <div className="notice">
          {target.displayName}’s picks are hidden until the pool locks at the first kickoff.
        </div>
      </>
    );
  }

  return (
    <>
      <Back code={code} name={pool.name} />
      <h1>
        {target.displayName}
        {isMe && <span className="muted small"> (you)</span>}
      </h1>
      <div className="panel">
        {pool.format === "predict_lock" && (await PredictDetail({ pool, target, matches }))}
        {pool.format === "sweepstake" && (await SweepstakeDetail({ pool, target, matches }))}
        {pool.format === "survivor" && (await SurvivorDetail({ pool, target, matches }))}
      </div>
    </>
  );
}

function Back({ code, name }: { code: string; name: string }) {
  return (
    <p className="small">
      <Link href={`/pool/${code}`}>← {name}</Link>
    </p>
  );
}

function Result({ status }: { status: "correct" | "wrong" | "pending" }) {
  if (status === "correct") return <span className="pill alive">✅ correct</span>;
  if (status === "wrong") return <span className="pill out">❌ missed</span>;
  return <span className="pill">⏳ pending</span>;
}

async function PredictDetail({ pool, target, matches }: { pool: Pool; target: Player; matches: Match[] }) {
  const preds = await db.query.predictions.findMany({ where: eq(predictions.playerId, target.id) });
  if (preds.length === 0) return <p className="muted">No picks were made.</p>;

  const standings = computeStandings(matches);
  const champ = champion(matches);
  const gb = await getGoldenBootWinners();
  const cfg = pool.settings.predictLock;

  const groupRows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].flatMap((g) => {
    return preds
      .filter((p) => (p.kind === "group_1st" || p.kind === "group_2nd") && p.slot === g)
      .map((p) => {
        const actual = p.kind === "group_1st" ? groupWinner(standings, g) : groupRunnerUp(standings, g);
        const status = actual === null ? "pending" : actual === p.team ? "correct" : "wrong";
        const pts = status === "correct" ? (p.kind === "group_1st" ? cfg.group1st : cfg.group2nd) : 0;
        return { label: `Group ${g} ${p.kind === "group_1st" ? "1st" : "2nd"}`, pick: p.team, actual, status, pts } as const;
      });
  });

  const champPick = preds.find((p) => p.kind === "champion");
  const gbPick = preds.find((p) => p.kind === "golden_boot");
  const extra: { label: string; pick: string; actual: string | null; status: "correct" | "wrong" | "pending"; pts: number }[] = [];
  if (champPick) {
    const status = champ === null ? "pending" : champ === champPick.team ? "correct" : "wrong";
    extra.push({ label: "Champion", pick: champPick.team, actual: champ, status, pts: status === "correct" ? cfg.champion : 0 });
  }
  if (gbPick) {
    const status = gb.length === 0 ? "pending" : gb.includes(gbPick.team) ? "correct" : "wrong";
    extra.push({ label: "Golden boot", pick: gbPick.team, actual: gb[0] ?? null, status, pts: status === "correct" ? cfg.goldenBoot : 0 });
  }

  const all = [...groupRows, ...extra];
  const total = all.reduce((s, r) => s + r.pts, 0);

  return (
    <table>
      <thead>
        <tr>
          <th>Pick</th>
          <th>Selection</th>
          <th>Actual</th>
          <th>Result</th>
          <th className="score">Pts</th>
        </tr>
      </thead>
      <tbody>
        {all.map((r, i) => (
          <tr key={i}>
            <td className="muted small">{r.label}</td>
            <td>{r.label === "Golden boot" ? r.pick : withFlag(r.pick)}</td>
            <td className="muted small">{r.actual ? (r.label === "Golden boot" ? r.actual : withFlag(r.actual)) : "—"}</td>
            <td><Result status={r.status} /></td>
            <td className="score">{r.pts || ""}</td>
          </tr>
        ))}
        <tr>
          <td colSpan={4} style={{ fontWeight: 700 }}>Total</td>
          <td className="score">{total}</td>
        </tr>
      </tbody>
    </table>
  );
}

async function SweepstakeDetail({ pool, target, matches }: { pool: Pool; target: Player; matches: Match[] }) {
  const rows = await db.query.assignments.findMany({ where: and(eq(assignments.poolId, pool.id), eq(assignments.playerId, target.id)) });
  if (rows.length === 0) return <p className="muted">No teams assigned yet.</p>;
  const scores = teamScores(matches, pool.settings);
  const teams = rows.map((r) => ({ team: r.team, pts: scores.get(r.team) ?? 0 })).sort((a, b) => b.pts - a.pts);
  const total = teams.reduce((s, t) => s + t.pts, 0);
  return (
    <table>
      <thead>
        <tr><th>Team</th><th className="score">Points</th></tr>
      </thead>
      <tbody>
        {teams.map((t) => (
          <tr key={t.team}>
            <td>{withFlag(t.team)}</td>
            <td className="score">{t.pts}</td>
          </tr>
        ))}
        <tr>
          <td style={{ fontWeight: 700 }}>Total</td>
          <td className="score">{total}</td>
        </tr>
      </tbody>
    </table>
  );
}

async function SurvivorDetail({ pool, target, matches }: { pool: Pool; target: Player; matches: Match[] }) {
  const picks = (
    await db.query.survivorPicks.findMany({ where: and(eq(survivorPicks.poolId, pool.id), eq(survivorPicks.playerId, target.id)) })
  ).sort((a, b) => a.pickDate.localeCompare(b.pickDate));
  if (picks.length === 0) return <p className="muted">No picks yet.</p>;

  let out = false;
  const rows = picks.map((p) => {
    const m = teamMatchOn(matches, p.pickDate, p.team);
    let status: "correct" | "wrong" | "pending" = "pending";
    if (m && m.status === "final") status = m.winner === p.team ? "correct" : "wrong";
    if (status === "wrong") out = true;
    return { date: p.pickDate, team: p.team, status };
  });

  return (
    <>
      <p>
        Status:{" "}
        {out ? <span className="pill out">Out</span> : <span className="pill alive">Alive</span>}
      </p>
      <table>
        <thead>
          <tr><th>Round</th><th>Backed</th><th>Result</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date}>
              <td className="muted small">{r.date}</td>
              <td>{withFlag(r.team)}</td>
              <td><Result status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
