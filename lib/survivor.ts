import type { Match } from "./feed";
import { isRealTeam } from "./tournament";

export type SurvivorRound = { index: number; date: string };

function bySchedule(a: Match, b: Match): number {
  return a.date.localeCompare(b.date) || Number(a.feedKey) - Number(b.feedKey);
}

// The survivor game uses the opening group-stage fixtures: each group's first
// pair of matches, where all four teams are making their first appearance.
export function openingGroupMatches(matches: Match[]): Match[] {
  const byGroup = new Map<string, Match[]>();
  for (const match of matches) {
    if (match.stage !== "group" || !match.group) continue;
    if (!isRealTeam(match.team1) || !isRealTeam(match.team2)) continue;
    byGroup.set(match.group, [...(byGroup.get(match.group) ?? []), match]);
  }

  const openingMatches: Match[] = [];
  for (const groupMatches of byGroup.values()) {
    const groupTeams = new Set<string>();
    for (const match of groupMatches) {
      groupTeams.add(match.team1);
      groupTeams.add(match.team2);
    }

    const seen = new Set<string>();
    for (const match of [...groupMatches].sort(bySchedule)) {
      if (seen.has(match.team1) || seen.has(match.team2)) continue;
      openingMatches.push(match);
      seen.add(match.team1);
      seen.add(match.team2);
      if (seen.size >= groupTeams.size) break;
    }
  }

  return openingMatches.sort(bySchedule);
}

// Survivor rounds are the calendar dates that contain opening group-stage fixtures.
export function rounds(matches: Match[]): SurvivorRound[] {
  const dates = [...new Set(openingGroupMatches(matches).map((match) => match.date))].sort();
  return dates.map((date, index) => ({ index, date }));
}

// The round currently open for picking: the earliest match day that is today or later.
export function currentRound(matches: Match[], today: string): SurvivorRound | null {
  return rounds(matches).find((r) => r.date >= today) ?? null;
}

export function teamsPlayingInRound(matches: Match[], date: string): string[] {
  const teams = new Set<string>();
  for (const match of openingGroupMatches(matches)) {
    if (match.date !== date) continue;
    teams.add(match.team1);
    teams.add(match.team2);
  }
  return [...teams].sort();
}
