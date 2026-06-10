"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OrderEntry = { id: number; name: string };
type HistoryRound = { date: string; picks: { name: string; team: string; outcome: string }[] };

export default function SurvivorBoard({
  code,
  date,
  order,
  pickerId,
  meId,
  available,
  myPickThisRound,
  pastDeadline,
  history,
}: {
  code: string;
  date: string | null;
  order: OrderEntry[];
  pickerId: number | null;
  meId: number;
  available: string[];
  myPickThisRound: string | null;
  pastDeadline: boolean;
  history: HistoryRound[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(team?: string) {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/pools/${code}/survivor-pick`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(team ? { date, team } : { date, auto: true }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({})))?.error ?? "Could not pick.");
    router.refresh();
  }

  const myTurn = pickerId === meId && !myPickThisRound;
  const pickerName = order.find((o) => o.id === pickerId)?.name ?? null;

  return (
    <div>
      {date ? (
        <>
          <div className="turn-banner">
            <strong>This round: {date}</strong>
            <div className="small muted" style={{ marginTop: 4 }}>
              Snake order:{" "}
              {order.map((o, i) => (
                <span key={o.id}>
                  {i > 0 && " → "}
                  <span style={{ fontWeight: o.id === pickerId ? 700 : 400, color: o.id === pickerId ? "var(--accent)" : undefined }}>
                    {o.name}
                    {o.id === meId ? " (you)" : ""}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {myTurn ? (
            <>
              <p className="small">Your turn — back a team that plays today to survive the round:</p>
              {available.length === 0 ? (
                <p className="muted">No available teams play this round.</p>
              ) : (
                <div className="teamlist">
                  {available.map((t) => (
                    <button key={t} className="secondary" disabled={busy} onClick={() => pick(t)}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : myPickThisRound ? (
            <p className="notice">You backed <strong>{myPickThisRound}</strong> this round.</p>
          ) : pickerName ? (
            <p className="muted">
              Waiting for <strong>{pickerName}</strong> to pick…
              {pastDeadline && (
                <>
                  {" "}
                  <button className="secondary" disabled={busy} onClick={() => pick()}>
                    Auto-pick (deadline passed)
                  </button>
                </>
              )}
            </p>
          ) : (
            <p className="muted">Everyone has picked this round.</p>
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
                    {p.name}: {p.team}{" "}
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
