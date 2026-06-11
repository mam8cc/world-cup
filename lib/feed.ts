// Parses the OpenFootball worldcup.json dataset into normalized match records.
// Source: https://raw.githubusercontent.com/openfootball/worldcup.json/master/<season>/worldcup.json
// No API key required; public domain data.

export type Stage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";

export const KNOCKOUT_STAGES: Stage[] = ["r32", "r16", "qf", "sf", "final"];

export type RawGoal = { name: string; minute?: number; penalty?: boolean; owngoal?: boolean };

export type RawMatch = {
  round: string;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
  score?: { ft?: [number, number]; ht?: [number, number]; et?: [number, number]; p?: [number, number] };
  goals1?: RawGoal[];
  goals2?: RawGoal[];
};

export type RawFeed = { name: string; matches: RawMatch[] };

export type Match = {
  // Stable identity for upserts: the match's index in the feed's matches array.
  feedKey: string;
  round: string;
  stage: Stage;
  date: string; // YYYY-MM-DD
  group: string | null; // "A".."L" or null for knockout
  team1: string;
  team2: string;
  ft: [number, number] | null;
  et: [number, number] | null;
  pens: [number, number] | null;
  status: "scheduled" | "final";
  // Winner team name, or null for an unplayed match or a group-stage draw.
  winner: string | null;
  // Kickoff as a precise UTC instant (from the feed's date + time), or null if unknown.
  kickoff: Date | null;
};

// Parse a feed time like "13:00 UTC-6" with its date into a UTC instant.
export function parseKickoff(date: string, time?: string): Date | null {
  if (!time) return null;
  const m = time.match(/^(\d{1,2}):(\d{2})\s*UTC([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!m) return null;
  const [, hh, mm, sign, oh, om] = m;
  const pad = (s: string) => s.padStart(2, "0");
  const iso = `${date}T${pad(hh)}:${mm}:00${sign}${pad(oh)}:${pad(om ?? "00")}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizeStage(round: string): Stage {
  const r = round.trim().toLowerCase();
  if (r.startsWith("matchday")) return "group";
  if (r.startsWith("round of 32")) return "r32";
  if (r.startsWith("round of 16")) return "r16";
  if (r.startsWith("quarter")) return "qf";
  if (r.startsWith("semi")) return "sf";
  if (r.startsWith("match for third")) return "third";
  if (r.startsWith("final")) return "final";
  // Unknown rounds default to group so they never silently count as knockout.
  return "group";
}

function normalizeGroup(group: string | undefined): string | null {
  if (!group) return null;
  const m = group.match(/group\s+([a-z])/i);
  return m ? m[1].toUpperCase() : null;
}

// A knockout match is decided by penalties, else extra time, else full time.
function decisiveScore(s: RawMatch["score"]): [number, number] | null {
  if (!s) return null;
  if (s.p) return s.p;
  if (s.et) return s.et;
  if (s.ft) return s.ft;
  return null;
}

export function parseFeed(feed: RawFeed): Match[] {
  return feed.matches.map((m, idx) => {
    const stage = normalizeStage(m.round);
    const decisive = decisiveScore(m.score);
    const played = decisive !== null;
    let winner: string | null = null;
    if (played) {
      const [a, b] = decisive!;
      if (a > b) winner = m.team1;
      else if (b > a) winner = m.team2;
      else winner = null; // draw (only meaningful in group stage)
    }
    return {
      // Index is stable across refreshes; knockout team names change as the
      // bracket resolves, so they must not be part of the key.
      feedKey: String(idx),
      round: m.round,
      stage,
      date: m.date,
      group: normalizeGroup(m.group),
      team1: m.team1,
      team2: m.team2,
      ft: m.score?.ft ?? null,
      et: m.score?.et ?? null,
      pens: m.score?.p ?? null,
      status: played ? "final" : "scheduled",
      winner,
      kickoff: parseKickoff(m.date, m.time),
    };
  });
}

export async function fetchFeed(season: string): Promise<Match[]> {
  const url = `https://raw.githubusercontent.com/openfootball/worldcup.json/master/${season}/worldcup.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch feed for ${season}: ${res.status}`);
  const json = (await res.json()) as RawFeed;
  return parseFeed(json);
}

// Goal tally across played matches for golden-boot scoring. Own goals excluded.
export function topScorers(matches: RawMatch[]): { name: string; goals: number }[] {
  const tally = new Map<string, number>();
  for (const m of matches) {
    if (!m.score?.ft && !m.score?.et) continue;
    for (const g of [...(m.goals1 ?? []), ...(m.goals2 ?? [])]) {
      if (g.owngoal) continue;
      tally.set(g.name, (tally.get(g.name) ?? 0) + 1);
    }
  }
  return [...tally.entries()]
    .map(([name, goals]) => ({ name, goals }))
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
}
