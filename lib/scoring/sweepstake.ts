import type { Match } from "../feed";
import { champion, stagesReached } from "../tournament";
import { rankRows, type LeaderboardRow, type Settings } from "./types";

export type PlayerAssignments = { playerId: number; displayName: string; teams: string[] };

// Points each team has earned: per-match win/draw + knockout stage-reached bonuses +
// champion bonus. Exposed so a player detail view can show a per-team breakdown.
export function teamScores(matches: Match[], settings: Settings): Map<string, number> {
  const cfg = settings.sweepstake;
  const champ = champion(matches);
  const reached = stagesReached(matches);

  const teamScore = new Map<string, number>();
  const bump = (team: string, pts: number) => teamScore.set(team, (teamScore.get(team) ?? 0) + pts);

  for (const m of matches) {
    if (m.status !== "final") continue;
    if (m.winner === null) {
      // Group-stage draw: both sides earn the draw value.
      bump(m.team1, cfg.draw);
      bump(m.team2, cfg.draw);
    } else {
      bump(m.winner, cfg.win);
    }
  }
  for (const [team, stages] of reached) {
    for (const s of stages) {
      const bonus = cfg.stageBonus[s as keyof typeof cfg.stageBonus];
      if (bonus) bump(team, bonus);
    }
  }
  if (champ) bump(champ, cfg.champion);
  return teamScore;
}

// Each player owns a set of teams (assigned by a random snake draw). A player's score
// is the sum of their teams' results.
export function scoreSweepstake(
  players: PlayerAssignments[],
  matches: Match[],
  settings: Settings,
): LeaderboardRow[] {
  const teamScore = teamScores(matches, settings);

  const rows = players.map((p) => {
    const score = p.teams.reduce((sum, t) => sum + (teamScore.get(t) ?? 0), 0);
    return {
      playerId: p.playerId,
      displayName: p.displayName,
      score,
      detail: `${p.teams.length} team${p.teams.length === 1 ? "" : "s"}`,
    };
  });

  return rankRows(rows);
}
