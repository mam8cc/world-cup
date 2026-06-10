import { NextResponse } from "next/server";
import { setSiteAdmin, verifyAdminKey } from "@/lib/auth";

export async function POST(req: Request) {
  if (!process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Admin area is not configured." }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const key = typeof body.key === "string" ? body.key : "";
  if (!verifyAdminKey(key)) {
    return NextResponse.json({ error: "Incorrect admin key." }, { status: 401 });
  }
  await setSiteAdmin(key);
  return NextResponse.json({ ok: true });
}
