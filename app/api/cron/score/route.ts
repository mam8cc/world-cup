import { NextResponse } from "next/server";
import { refreshResults } from "@/lib/refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Triggered hourly by Vercel Cron (see vercel.json). Refreshes match results from the
// feed; leaderboards are computed live from this data, so there is nothing else to do.
// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const result = await refreshResults();
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
}

export const GET = run;
export const POST = run;
