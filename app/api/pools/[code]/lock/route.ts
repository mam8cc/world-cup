import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pools } from "@/lib/db/schema";
import { getAdminToken } from "@/lib/auth";
import { getPoolByCode } from "@/lib/pool";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await getPoolByCode(code);
  if (!pool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  if ((await getAdminToken(code)) !== pool.adminToken) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }
  await db.update(pools).set({ status: "locked", lockAt: new Date() }).where(eq(pools.id, pool.id));
  return NextResponse.json({ ok: true });
}
