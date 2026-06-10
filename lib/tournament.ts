import type { Match, Stage } from "./feed";
import { KNOCKOUT_STAGES } from "./feed";

// Knockout fixtures use placeholders ("2A", "1E", "3A/B/C/D/F", "W101") until the
// bracket resolves upstream. Filter those out wherever real teams are required.
export function isRealTeam(name: string): boolean {
  if (!name) return false;
  if (name.includes("/")) return false;
  if (/^\d/.test(name)) return false; // "2A", "1E"
  if (/^W\d+$/i.test(name)) return false; // "W101"
  if (/^(winner|loser|runner)/i.test(name)) return false;
  return true;
}

// Champion = winner of the Final, once it has been played.
export function champion(matches: Match[]): string | null {
  const final = matches.find((m) => m.stage === "final" && m.status === "final");
  return final && final.winner && isRealTeam(final.winner) ? final.winner : null;
}

// Every real national team (derived from the group stage), e.g. the 48-team pool.
export function allTeams(matches: Match[]): string[] {
  const set = new Set<string>();
  for (const m of matches) {
    if (m.stage !== "group") continue;
    if (isRealTeam(m.team1)) set.add(m.team1);
    if (isRealTeam(m.team2)) set.add(m.team2);
  }
  return [...set].sort();
}

// Group letter -> sorted real team names, derived from the group stage.
export function groups(matches: Match[]): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const m of matches) {
    if (m.stage !== "group" || !m.group) continue;
    (out[m.group] ??= new Set());
    if (isRealTeam(m.team1)) out[m.group].add(m.team1);
    if (isRealTeam(m.team2)) out[m.group].add(m.team2);
  }
  const sorted: Record<string, string[]> = {};
  for (const g of Object.keys(out).sort()) sorted[g] = [...out[g]].sort();
  return sorted;
}

// Sorted unique calendar dates that have at least one match — a survivor "round" is a day.
export function matchDates(matches: Match[]): string[] {
  return [...new Set(matches.map((m) => m.date))].sort();
}

// Real teams that have a fixture on a given date. A knocked-out team has no future
// fixtures, so this naturally restricts survivor picks to teams still in the tournament.
export function teamsPlayingOn(matches: Match[], date: string): string[] {
  const set = new Set<string>();
  for (const m of matches) {
    if (m.date !== date) continue;
    if (isRealTeam(m.team1)) set.add(m.team1);
    if (isRealTeam(m.team2)) set.add(m.team2);
  }
  return [...set].sort();
}

// The match a team plays on a date (if any).
export function teamMatchOn(matches: Match[], date: string, team: string): Match | null {
  return matches.find((m) => m.date === date && (m.team1 === team || m.team2 === team)) ?? null;
}

// Knockout stages each team has appeared in (as a real, played participant). Used for
// sweepstake "stage reached" bonuses.
export function stagesReached(matches: Match[]): Map<string, Set<Stage>> {
  const reached = new Map<string, Set<Stage>>();
  const add = (team: string, stage: Stage) => {
    if (!isRealTeam(team)) return;
    if (!reached.has(team)) reached.set(team, new Set());
    reached.get(team)!.add(stage);
  };
  for (const m of matches) {
    if (!KNOCKOUT_STAGES.includes(m.stage)) continue;
    if (m.status !== "final") continue;
    add(m.team1, m.stage);
    add(m.team2, m.stage);
  }
  return reached;
}
