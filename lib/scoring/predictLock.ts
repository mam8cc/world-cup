import type { Match } from "../feed";
import { computeStandings, groupRunnerUp, groupWinner } from "../standings";
import { champion } from "../tournament";
import { rankRows, type LeaderboardRow, type Settings } from "./types";

export type PredictionKind = "group_1st" | "group_2nd" | "champion" | "golden_boot";
export type Prediction = { kind: PredictionKind; slot: string; team: string };
export type PlayerPredictions = { playerId: number; displayName: string; predictions: Prediction[] };

// Picks are made once and locked at kickoff; scoring re-runs as results arrive.
// goldenBootWinners is supplied by the caller (via feed.topScorers) so this stays pure.
export function scorePredictLock(
  players: PlayerPredictions[],
  matches: Match[],
  settings: Settings,
  goldenBootWinners: string[] = [],
): LeaderboardRow[] {
  const standings = computeStandings(matches);
  const champ = champion(matches);
  const cfg = settings.predictLock;
  const gb = new Set(goldenBootWinners);

  const rows = players.map((p) => {
    let score = 0;
    let hits = 0;
    for (const pick of p.predictions) {
      let correct = false;
      switch (pick.kind) {
        case "group_1st":
          correct = groupWinner(standings, pick.slot) === pick.team;
          if (correct) score += cfg.group1st;
          break;
        case "group_2nd":
          correct = groupRunnerUp(standings, pick.slot) === pick.team;
          if (correct) score += cfg.group2nd;
          break;
        case "champion":
          correct = champ !== null && champ === pick.team;
          if (correct) score += cfg.champion;
          break;
        case "golden_boot":
          correct = gb.has(pick.team);
          if (correct) score += cfg.goldenBoot;
          break;
      }
      if (correct) hits++;
    }
    return { playerId: p.playerId, displayName: p.displayName, score, detail: `${hits} correct` };
  });

  return rankRows(rows);
}
