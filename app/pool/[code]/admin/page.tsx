import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import AdminPanel from "@/app/components/AdminPanel";
import { getAdminToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignments } from "@/lib/db/schema";
import { withFlag } from "@/lib/flags";
import { getMatches, getPoolByCode } from "@/lib/pool";

export default async function AdminPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await getPoolByCode(code);
  if (!pool) notFound();
  if ((await getAdminToken(code)) !== pool.adminToken) redirect(`/pool/${code}`);

  const drawDone =
    pool.format === "sweepstake" &&
    !!(await db.query.assignments.findFirst({ where: eq(assignments.poolId, pool.id) }));

  const matches = await getMatches();
  const matchOpts = matches.map((m) => ({
    feedKey: m.feedKey,
    label: `${m.date} ${m.round}: ${withFlag(m.team1)} v ${withFlag(m.team2)}`,
    ft1: m.ft?.[0] ?? null,
    ft2: m.ft?.[1] ?? null,
  }));

  return (
    <>
      <p className="small">
        <Link href={`/pool/${code}`}>← {pool.name}</Link>
      </p>
      <h1>Admin</h1>
      <AdminPanel
        code={code}
        format={pool.format}
        status={pool.status}
        drawDone={drawDone}
        matches={matchOpts}
      />
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Export</h2>
        <p className="muted small">Download every player’s picks as a spreadsheet (CSV).</p>
        <a className="btn secondary" href={`/api/pools/${code}/export`}>
          Export all picks (CSV)
        </a>
      </div>
    </>
  );
}
