import { NextResponse } from "next/server";
import { clearSiteAdmin } from "@/lib/auth";

export async function POST() {
  await clearSiteAdmin();
  return NextResponse.json({ ok: true });
}
