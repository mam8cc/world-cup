import type { Match } from "../feed";
import { teamMatchOn } from "../tournament";
import { rankRows, type LeaderboardRow, type Settings } from "./types";

export type SurvivorPick = { date: string; team: string };
export type PlayerSurvivor = { playerId: number; displayName: string; picks: SurvivorPick[] };

const ALIVE_BONUS = 100000;

// Each day a player backs a still-alive team. The team wins → they survive; draw (in
// group stage) or loss → eliminated. Last player standing wins. Score ranks alive
// players above eliminated ones, then by number of rounds survived.
export function scoreSurvivor(
  players: PlayerSurvivor[],
  matches: Match[],
  settings: Settings,
): LeaderboardRow[] {
  const rows = players.map((p) => {
    const picks = [...p.picks].sort((a, b) => a.date.localeCompare(b.date));
    let survived = 0;
    let eliminatedDate: string | null = null;

    for (const pick of picks) {
      const match = teamMatchOn(matches, pick.date, pick.team);
      if (!match || match.status !== "final") break; // result pending — nothing more to score
      if (match.winner === pick.team) {
        survived++;
      } else if (match.winner === null) {
        // Group-stage draw.
        if (settings.survivor.drawEliminates) { eliminatedDate = pick.date; break; }
        survived++;
      } else {
        eliminatedDate = pick.date;
        break;
      }
    }

    const alive = eliminatedDate === null;
    const score = (alive ? ALIVE_BONUS : 0) + survived;
    const detail = alive ? `Alive · ${survived} round${survived === 1 ? "" : "s"}` : `Out (${eliminatedDate})`;
    return { playerId: p.playerId, displayName: p.displayName, score, detail };
  });

  return rankRows(rows);
}
