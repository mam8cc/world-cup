import type { Match } from "./feed";
import type { Player } from "./db/schema";
import { matchDates } from "./tournament";

export type SurvivorRound = { index: number; date: string };

// Survivor rounds are calendar days that have matches.
export function rounds(matches: Match[]): SurvivorRound[] {
  return matchDates(matches).map((date, index) => ({ index, date }));
}

// The round currently open for picking: the earliest match day that is today or later.
export function currentRound(matches: Match[], today: string): SurvivorRound | null {
  return rounds(matches).find((r) => r.date >= today) ?? null;
}

// Snake order: odd rounds (0-indexed even) run forwards, the next reverses, and so on.
export function orderForRound(playersByDraft: Player[], roundIndex: number): Player[] {
  const forward = [...playersByDraft];
  return roundIndex % 2 === 0 ? forward : forward.reverse();
}

// Index of the player whose turn it is this round, given how many already picked. Players
// are expected pre-sorted into this round's order. Returns null when everyone has picked.
export function pickerIndex(order: Player[], pickedPlayerIds: Set<number>): number | null {
  for (let i = 0; i < order.length; i++) {
    if (!pickedPlayerIds.has(order[i].id)) return i;
  }
  return null;
}
