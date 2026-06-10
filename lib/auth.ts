import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export function playerCookieName(code: string): string {
  return `wc_player_${code}`;
}
export function adminCookieName(code: string): string {
  return `wc_admin_${code}`;
}

const SITE_ADMIN_COOKIE = "wc_site_admin";

const MAX_AGE = 60 * 60 * 24 * 120; // ~4 months covers the tournament
const COOKIE_OPTS = { httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE } as const;

export async function getPlayerToken(code: string): Promise<string | null> {
  const store = await cookies();
  return store.get(playerCookieName(code))?.value ?? null;
}

export async function getAdminToken(code: string): Promise<string | null> {
  const store = await cookies();
  return store.get(adminCookieName(code))?.value ?? null;
}

// Only callable from Route Handlers / Server Actions (not during render).
export async function setPlayerToken(code: string, token: string): Promise<void> {
  const store = await cookies();
  store.set(playerCookieName(code), token, COOKIE_OPTS);
}

export async function setAdminToken(code: string, token: string): Promise<void> {
  const store = await cookies();
  store.set(adminCookieName(code), token, COOKIE_OPTS);
}

// --- Site admin (operator across all pools) ---------------------------------
// Gated by the ADMIN_KEY env var. When unset, the site-admin area is disabled.

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function verifyAdminKey(key: string): boolean {
  const expected = process.env.ADMIN_KEY;
  return !!expected && typeof key === "string" && safeEqual(key, expected);
}

export async function isSiteAdmin(): Promise<boolean> {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return false;
  const store = await cookies();
  const value = store.get(SITE_ADMIN_COOKIE)?.value;
  return !!value && safeEqual(value, expected);
}

export async function setSiteAdmin(key: string): Promise<void> {
  const store = await cookies();
  store.set(SITE_ADMIN_COOKIE, key, COOKIE_OPTS);
}

export async function clearSiteAdmin(): Promise<void> {
  const store = await cookies();
  store.delete(SITE_ADMIN_COOKIE);
}
