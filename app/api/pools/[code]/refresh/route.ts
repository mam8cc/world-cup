import { NextResponse } from "next/server";
import { getAdminToken } from "@/lib/auth";
import { getPoolByCode } from "@/lib/pool";
import { refreshResults } from "@/lib/refresh";

// Admin-triggered manual results refresh (the hourly cron does this automatically).
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const pool = await getPoolByCode(code);
  if (!pool) return NextResponse.json({ error: "Pool not found." }, { status: 404 });
  if ((await getAdminToken(code)) !== pool.adminToken) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }
  const result = await refreshResults();
  return NextResponse.json({ ok: true, ...result });
}
