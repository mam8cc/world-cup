import type { Match } from "./feed";

export type GroupRow = {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

// Group tables computed from final group-stage matches only.
// Ranking: points, then goal difference, then goals for, then name (a simplified
// FIFA tie-break — head-to-head is omitted intentionally for an office pool).
export function computeStandings(matches: Match[]): Record<string, GroupRow[]> {
  const groups = new Map<string, Map<string, GroupRow>>();

  const row = (g: string, team: string): GroupRow => {
    if (!groups.has(g)) groups.set(g, new Map());
    const table = groups.get(g)!;
    if (!table.has(team)) {
      table.set(team, { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 });
    }
    return table.get(team)!;
  };

  for (const m of matches) {
    if (m.stage !== "group" || !m.group) continue;
    // Register fixtures even before they're played so every team appears.
    const r1 = row(m.group, m.team1);
    const r2 = row(m.group, m.team2);
    if (m.status !== "final" || !m.ft) continue;
    const [a, b] = m.ft;
    r1.played++; r2.played++;
    r1.gf += a; r1.ga += b;
    r2.gf += b; r2.ga += a;
    if (a > b) { r1.won++; r2.lost++; r1.points += 3; }
    else if (b > a) { r2.won++; r1.lost++; r2.points += 3; }
    else { r1.drawn++; r2.drawn++; r1.points += 1; r2.points += 1; }
  }

  const result: Record<string, GroupRow[]> = {};
  for (const [g, table] of groups) {
    const rows = [...table.values()];
    for (const r of rows) r.gd = r.gf - r.ga;
    rows.sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf || x.team.localeCompare(y.team));
    result[g] = rows;
  }
  return result;
}

export function groupWinner(standings: Record<string, GroupRow[]>, group: string): string | null {
  const rows = standings[group];
  return rows && rows.length > 0 && rows[0].played > 0 ? rows[0].team : null;
}

export function groupRunnerUp(standings: Record<string, GroupRow[]>, group: string): string | null {
  const rows = standings[group];
  return rows && rows.length > 1 && rows[1].played > 0 ? rows[1].team : null;
}
