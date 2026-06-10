import type { Match } from "../feed";
import { champion, stagesReached } from "../tournament";
import { rankRows, type LeaderboardRow, type Settings } from "./types";

export type PlayerAssignments = { playerId: number; displayName: string; teams: string[] };

// Each player owns a set of teams (assigned by a random snake draw). A player's score
// is the sum of their teams' results: per-match win/draw points + knockout stage-reached
// bonuses + a champion bonus.
export function scoreSweepstake(
  players: PlayerAssignments[],
  matches: Match[],
  settings: Settings,
): LeaderboardRow[] {
  const cfg = settings.sweepstake;
  const champ = champion(matches);
  const reached = stagesReached(matches);

  // Per-team running score from match results.
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
