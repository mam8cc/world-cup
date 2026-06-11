import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assignments, pools } from "@/lib/db/schema";
import { isPoolAdmin } from "@/lib/auth";
import { getPoolByCode } from "@/lib/pool";

// Reopen a pool for picks. For a sweepstake this also clears the draw so a fresh one
// can be run after the roster changes.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await getPoolByCode(code);
  if (!pool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  if (!(await isPoolAdmin(code, pool.adminToken))) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  await db.transaction(async (tx) => {
    await tx.update(pools).set({ status: "setup", lockAt: null }).where(eq(pools.id, pool.id));
    if (pool.format === "sweepstake") {
      await tx.delete(assignments).where(eq(assignments.poolId, pool.id));
    }
  });

  return NextResponse.json({ ok: true });
}
