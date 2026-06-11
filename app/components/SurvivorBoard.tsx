"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { withFlag } from "@/lib/flags";

type HistoryRound = { date: string; picks: { name: string; team: string; outcome: string }[] };

export default function SurvivorBoard({
  code,
  date,
  available,
  myPickThisRound,
  pastDeadline,
  history,
}: {
  code: string;
  date: string | null;
  available: string[];
  myPickThisRound: string | null;
  pastDeadline: boolean;
  history: HistoryRound[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(team: string) {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/pools/${code}/survivor-pick`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, team }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({})))?.error ?? "Could not pick.");
    router.refresh();
  }

  return (
    <div>
      {date ? (
        <>
          <div className="turn-banner">
            <strong>This round: {date}</strong>
            <div className="small muted" style={{ marginTop: 4 }}>
              Pick any team playing in this opening group-stage round.
            </div>
          </div>

          {!myPickThisRound && !pastDeadline ? (
            <>
              <p className="small">Back a team to survive the round:</p>
              {available.length === 0 ? (
                <p className="muted">No available teams play this round.</p>
              ) : (
                <div className="teamlist">
                  {available.map((t) => (
                    <button key={t} className="secondary" disabled={busy} onClick={() => pick(t)}>
                      {withFlag(t)}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : myPickThisRound ? (
            <p className="notice">You backed <strong>{withFlag(myPickThisRound)}</strong> this round.</p>
          ) : pastDeadline ? (
            <p className="muted">This round's deadline has passed.</p>
          ) : (
            <p className="muted">No pick is open right now.</p>
          )}
          {error && <div className="error">{error}</div>}
        </>
      ) : (
        <div className="notice">The tournament is over — no more rounds to pick.</div>
      )}

      {history.length > 0 && (
        <>
          <h2>Pick history</h2>
          {history.map((h) => (
            <div key={h.date} className="panel" style={{ padding: 12 }}>
              <div className="small muted" style={{ marginBottom: 6 }}>{h.date}</div>
              <div className="teamlist">
                {h.picks.map((p, i) => (
                  <span key={i} className={`teamchip ${p.outcome === "out" ? "used" : ""}`}>
                    {p.name}: {withFlag(p.team)}{" "}
                    {p.outcome === "survived" ? "✅" : p.outcome === "out" ? "❌" : "⏳"}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
