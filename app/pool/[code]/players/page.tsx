import Link from "next/link";
import { notFound } from "next/navigation";
import Leaderboard from "@/app/components/Leaderboard";
import { getPlayerToken } from "@/lib/auth";
import { computeLeaderboard } from "@/lib/leaderboard";
import { getCurrentPlayer, getMatches, getPlayers, getPoolByCode, picksVisible } from "@/lib/pool";

export default async function PoolPlayers({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await getPoolByCode(code);
  if (!pool) notFound();

  // Viewable without joining — handy when you've lost your browser session.
  const me = await getCurrentPlayer(pool.id, await getPlayerToken(code));
  const players = await getPlayers(pool.id);
  const matches = await getMatches();
  const rows = await computeLeaderboard(pool, players, matches);
  const canViewPicks = picksVisible(pool, matches);

  return (
    <>
      <p className="small">
        <Link href={`/pool/${code}`}>← {pool.name}</Link>
      </p>
      <h1>Players</h1>
      <p className="muted">
        {players.length} player{players.length === 1 ? "" : "s"}
        {!me && " · "}
        {!me && <Link href={`/pool/${code}`}>join this pool</Link>}
      </p>

      <div className="panel">
        {players.length === 0 ? (
          <p className="muted small">No one has joined yet.</p>
        ) : (
          <>
            <Leaderboard rows={rows} meId={me?.id ?? null} format={pool.format} code={code} linkable={canViewPicks} />
            <p className="muted small" style={{ marginTop: 10 }}>
              {canViewPicks
                ? `Tap a player’s name to see their ${pool.format === "sweepstake" ? "teams" : "picks"} and results.`
                : "Everyone’s picks become visible once the pool locks at the first kickoff."}
            </p>
          </>
        )}
      </div>
    </>
  );
}
