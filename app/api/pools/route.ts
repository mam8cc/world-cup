import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pools } from "@/lib/db/schema";
import { setAdminToken } from "@/lib/auth";
import { joinCode, secretToken } from "@/lib/tokens";
import { DEFAULT_SETTINGS, type PoolFormat } from "@/lib/scoring/types";

const FORMATS: PoolFormat[] = ["predict_lock", "sweepstake", "survivor"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const format = body.format as PoolFormat;

  if (!name) return NextResponse.json({ error: "Pool name is required." }, { status: 400 });
  if (!FORMATS.includes(format)) return NextResponse.json({ error: "Invalid format." }, { status: 400 });

  const adminToken = secretToken();
  let code = "";
  // Retry on the (extremely unlikely) join-code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    code = joinCode();
    try {
      await db.insert(pools).values({ name, format, joinCode: code, adminToken, settings: DEFAULT_SETTINGS });
      await setAdminToken(code, adminToken);
      return NextResponse.json({ code });
    } catch (err) {
      if (attempt === 4) throw err;
    }
  }
  return NextResponse.json({ error: "Could not create pool." }, { status: 500 });
}
