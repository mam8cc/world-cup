import Link from "next/link";
import AdminLogin from "@/app/components/AdminLogin";
import AdminLogout from "@/app/components/AdminLogout";
import { isSiteAdmin } from "@/lib/auth";
import { listPools } from "@/lib/pool";

export const dynamic = "force-dynamic";

const FORMAT_LABEL: Record<string, string> = {
  predict_lock: "Predict & Lock",
  sweepstake: "Sweepstake",
  survivor: "Survivor",
};

export default async function SiteAdmin() {
  if (!(await isSiteAdmin())) {
    return (
      <>
        <h1>Admin</h1>
        <AdminLogin configured={!!process.env.ADMIN_KEY} />
      </>
    );
  }

  const pools = await listPools();
  const totalPlayers = pools.reduce((s, p) => s + p.players, 0);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>All pools</h1>
        <AdminLogout />
      </div>
      <p className="muted">
        {pools.length} pool{pools.length === 1 ? "" : "s"} · {totalPlayers} player
        {totalPlayers === 1 ? "" : "s"} total
      </p>

      <div className="panel">
        {pools.length === 0 ? (
          <p className="muted small">No pools created yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Pool</th>
                <th>Format</th>
                <th>Status</th>
                <th className="score">Players</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pools.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/pool/${p.joinCode}`}>{p.name}</Link>
                    <div className="muted small">{p.joinCode}</div>
                  </td>
                  <td className="small">{FORMAT_LABEL[p.format] ?? p.format}</td>
                  <td className="small">{p.status}</td>
                  <td className="score">{p.players}</td>
                  <td className="muted small">{new Date(p.createdAt).toISOString().slice(0, 10)}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn secondary" href={`/pool/${p.joinCode}/admin`}>
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
