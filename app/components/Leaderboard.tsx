import type { LeaderboardRow } from "@/lib/scoring/types";
import type { PoolFormat } from "@/lib/scoring/types";

export default function Leaderboard({
  rows,
  meId,
  format,
}: {
  rows: LeaderboardRow[];
  meId: number | null;
  format: PoolFormat;
}) {
  if (rows.length === 0) {
    return <p className="muted small">No players yet. Share the link to get people in.</p>;
  }
  const scoreLabel = format === "survivor" ? "Status" : "Points";
  return (
    <table>
      <thead>
        <tr>
          <th className="rank">#</th>
          <th>Player</th>
          <th>{format === "survivor" ? "" : "Detail"}</th>
          <th className="score">{scoreLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.playerId} className={r.playerId === meId ? "me" : ""}>
            <td className="rank">{r.rank}</td>
            <td>
              {r.displayName}
              {r.playerId === meId && <span className="muted small"> (you)</span>}
            </td>
            <td className="muted small">{format === "survivor" ? "" : r.detail}</td>
            <td className="score">
              {format === "survivor" ? (
                <span className={`pill ${r.detail?.startsWith("Alive") ? "alive" : "out"}`}>{r.detail}</span>
              ) : (
                r.score
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
