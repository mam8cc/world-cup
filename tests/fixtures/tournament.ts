import type { RawFeed, RawMatch } from "../../lib/feed";

// A deterministic, fully-played synthetic 2026 tournament used by the walkthrough tests.
// Teams are globally ranked (strongest first); the stronger team always wins. That makes
// every outcome — group tables, the bracket, the champion — predictable from the ranking.

const RANKING = [
  "Argentina", "France", "Brazil", "England", "Spain", "Portugal", "Netherlands", "Germany",
  "Belgium", "Croatia", "Uruguay", "Morocco", "Colombia", "Mexico", "USA", "Switzerland",
  "Japan", "Senegal", "Ecuador", "Sweden", "Norway", "Austria", "Turkey", "South Korea",
  "Australia", "Egypt", "Ivory Coast", "Ghana", "Canada", "Scotland", "Paraguay", "Tunisia",
  "Iran", "Qatar", "Saudi Arabia", "Algeria", "DR Congo", "Cape Verde", "Panama", "Iraq",
  "Jordan", "Uzbekistan", "South Africa", "Czech Republic", "Bosnia & Herzegovina",
  "New Zealand", "Curaçao", "Haiti",
];

const LETTERS = "ABCDEFGHIJKL".split("");

const DATES = {
  md1: "2026-06-11",
  md2: "2026-06-12",
  md3: "2026-06-13",
  r32: "2026-06-14",
  r16: "2026-06-15",
  qf: "2026-06-16",
  sf: "2026-06-17",
  finals: "2026-06-18",
};

export type BuiltTournament = {
  feed: RawFeed;
  ranking: string[];
  groups: Record<string, string[]>; // letter -> 4 teams, strongest first
  groupOrder: Record<string, string[]>; // final standings order (== strength order here)
  champion: string;
  runnerUp: string;
  dates: string[]; // sorted match days
  byDate: Record<string, { winners: string[]; losers: string[] }>;
};

export function buildTournament(): BuiltTournament {
  const ranking = RANKING;
  const rankIndex = new Map(ranking.map((t, i) => [t, i] as const));
  const ri = (t: string) => rankIndex.get(t)!;

  const groups: Record<string, string[]> = {};
  LETTERS.forEach((L, gi) => {
    groups[L] = ranking.slice(gi * 4, gi * 4 + 4);
  });

  const matches: RawMatch[] = [];
  const groupScore = (t1: string, t2: string): [number, number] => (ri(t1) < ri(t2) ? [2, 0] : [0, 2]);
  const koScore = (t1: string, t2: string): [number, number] => (ri(t1) < ri(t2) ? [1, 0] : [0, 1]);
  const winnerOf = (t1: string, t2: string, s: [number, number]) => (s[0] > s[1] ? t1 : t2);

  // Group stage: circle-method schedule so each team plays once per matchday.
  for (const L of LETTERS) {
    const [a, b, c, d] = groups[L];
    const schedule: [string, string, [string, string][]][] = [
      ["Matchday 1", DATES.md1, [[a, d], [b, c]]],
      ["Matchday 2", DATES.md2, [[a, c], [d, b]]],
      ["Matchday 3", DATES.md3, [[a, b], [c, d]]],
    ];
    for (const [round, date, pairs] of schedule) {
      for (const [t1, t2] of pairs) {
        matches.push({ round, date, team1: t1, team2: t2, group: `Group ${L}`, score: { ft: groupScore(t1, t2) } });
      }
    }
  }

  // Advancers: 12 winners + 12 runners-up + the 8 best third-placed teams.
  const winners = LETTERS.map((L) => groups[L][0]);
  const runners = LETTERS.map((L) => groups[L][1]);
  const thirds = LETTERS.map((L) => groups[L][2]).sort((x, y) => ri(x) - ri(y)).slice(0, 8);
  const field = [...winners, ...runners, ...thirds].sort((x, y) => ri(x) - ri(y)); // 32 seeds

  // A knockout round: pair strongest-vs-weakest, stronger advances; return advancers sorted.
  const playRound = (round: string, date: string, teams: string[]): string[] => {
    const advancing: string[] = [];
    for (let i = 0; i < teams.length / 2; i++) {
      const t1 = teams[i];
      const t2 = teams[teams.length - 1 - i];
      const s = koScore(t1, t2);
      matches.push({ round, date, team1: t1, team2: t2, score: { ft: s } });
      advancing.push(winnerOf(t1, t2, s));
    }
    return advancing.sort((x, y) => ri(x) - ri(y));
  };

  const r32 = playRound("Round of 32", DATES.r32, field); // 16
  const r16 = playRound("Round of 16", DATES.r16, r32); // 8
  const qf = playRound("Quarter-final", DATES.qf, r16); // 4

  // Semi-finals — capture losers for the third-place match.
  const sfPairs: [string, string][] = [[qf[0], qf[3]], [qf[1], qf[2]]];
  const sfWinners: string[] = [];
  const sfLosers: string[] = [];
  for (const [t1, t2] of sfPairs) {
    const s = koScore(t1, t2);
    matches.push({ round: "Semi-final", date: DATES.sf, team1: t1, team2: t2, score: { ft: s } });
    const w = winnerOf(t1, t2, s);
    sfWinners.push(w);
    sfLosers.push(w === t1 ? t2 : t1);
  }

  const [l1, l2] = sfLosers;
  matches.push({ round: "Match for third place", date: DATES.finals, team1: l1, team2: l2, score: { ft: koScore(l1, l2) } });

  const finalists = [...sfWinners].sort((x, y) => ri(x) - ri(y));
  const [f1, f2] = finalists;
  const fs = koScore(f1, f2);
  matches.push({ round: "Final", date: DATES.finals, team1: f1, team2: f2, score: { ft: fs } });
  const champion = winnerOf(f1, f2, fs);
  const runnerUp = champion === f1 ? f2 : f1;

  // Per-day winners/losers (for building survivor picks).
  const byDate: Record<string, { winners: string[]; losers: string[] }> = {};
  for (const m of matches) {
    const ft = m.score!.ft!;
    const w = ft[0] > ft[1] ? m.team1 : m.team2;
    const l = ft[0] > ft[1] ? m.team2 : m.team1;
    (byDate[m.date] ??= { winners: [], losers: [] }).winners.push(w);
    byDate[m.date].losers.push(l);
  }

  const groupOrder: Record<string, string[]> = {};
  for (const L of LETTERS) groupOrder[L] = groups[L]; // standings order == strength order

  return {
    feed: { name: "Synthetic World Cup 2026", matches },
    ranking,
    groups,
    groupOrder,
    champion,
    runnerUp,
    dates: Object.keys(byDate).sort(),
    byDate,
  };
}
