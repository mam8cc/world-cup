import { randomBytes, randomUUID } from "node:crypto";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous chars

// Short, human-shareable pool code, e.g. "kq7m2x".
export function joinCode(len = 6): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// Opaque secret used to authenticate a player or pool admin.
export function secretToken(): string {
  return randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}
