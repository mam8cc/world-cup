import { cookies } from "next/headers";

export function playerCookieName(code: string): string {
  return `wc_player_${code}`;
}
export function adminCookieName(code: string): string {
  return `wc_admin_${code}`;
}

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
