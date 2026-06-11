import Link from "next/link";
import { notFound } from "next/navigation";
import JoinForm from "@/app/components/JoinForm";
import Leaderboard from "@/app/components/Leaderboard";
import ShareLink from "@/app/components/ShareLink";
import { getPlayerToken } from "@/lib/auth";
import { computeLeaderboard } from "@/lib/leaderboard";
import { getCurrentPlayer, getMatches, getPlayers, getPoolByCode, picksVisible, predictionsOpen } from "@/lib/pool";

const FORMAT_LABEL: Record<string, string> = {
  predict_lock: "Predict & Lock",
  sweepstake: "Sweepstake",
  survivor: "Survivor",
};

export default async function PoolHome({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await getPoolByCode(code);
  if (!pool) notFound();

  const token = await getPlayerToken(code);
  const me = await getCurrentPlayer(pool.id, token);
  const players = await getPlayers(pool.id);

  if (!me) {
    return (
      <>
        <h1>{pool.name}</h1>
        <p className="muted">
          <span className="pill">{FORMAT_LABEL[pool.format]}</span>{" "}
          · <Link href={`/pool/${code}/players`}>{players.length} player{players.length === 1 ? "" : "s"}</Link>
        </p>
        <JoinForm code={code} poolName={pool.name} />
      </>
    );
  }

  const matches = await getMatches();
  const rows = await computeLeaderboard(pool, players, matches);
  const open = predictionsOpen(pool, matches);
  const canViewPicks = picksVisible(pool, matches);

  return (
    <>
      <h1>{pool.name}</h1>
      <p className="muted">
        <span className="pill">{FORMAT_LABEL[pool.format]}</span>{" "}
        · <Link href={`/pool/${code}/players`}>{players.length} player{players.length === 1 ? "" : "s"}</Link>{" "}
        · status: {pool.status}
      </p>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Invite</h2>
        <p className="muted small">Anyone with this link can join and make picks.</p>
        <ShareLink code={code} />
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Standings</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <Link className="btn" href={`/pool/${code}/picks`}>
              {pool.format === "sweepstake" ? "My teams" : open ? "Make picks" : "View picks"}
            </Link>
            {(canViewPicks || me.isAdmin) && (
              <a className="btn secondary" href={`/api/pools/${code}/export`}>
                Export CSV
              </a>
            )}
            {me.isAdmin && (
              <Link className="btn secondary" href={`/pool/${code}/admin`}>
                Admin
              </Link>
            )}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Leaderboard rows={rows} meId={me.id} format={pool.format} code={code} linkable={canViewPicks} />
        </div>
        {canViewPicks && (
          <p className="muted small" style={{ marginTop: 10 }}>
            Tap a player’s name to see their {pool.format === "sweepstake" ? "teams" : "picks"} and results.
          </p>
        )}
      </div>
    </>
  );
}
