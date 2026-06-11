"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MatchOpt = { feedKey: string; label: string; ft1: number | null; ft2: number | null };
type PlayerRow = { id: number; name: string; isAdmin: boolean };

export default function AdminPanel({
  code,
  format,
  status,
  drawDone,
  matches,
  players,
}: {
  code: string;
  format: string;
  status: string;
  drawDone: boolean;
  matches: MatchOpt[];
  players: PlayerRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [feedKey, setFeedKey] = useState(matches[0]?.feedKey ?? "");
  const [s1, setS1] = useState("0");
  const [s2, setS2] = useState("0");

  async function call(label: string, url: string, body?: unknown) {
    setError(null);
    setMsg(null);
    setBusy(label);
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data?.error ?? "Action failed.");
    setMsg(data?.matches ? `Done — ${data.matches} matches refreshed.` : "Done.");
    router.refresh();
  }

  return (
    <>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Results</h2>
        <p className="muted small">
          Results refresh automatically every hour. Use this to pull the latest immediately.
        </p>
        <button disabled={busy !== null} onClick={() => call("refresh", `/api/pools/${code}/refresh`)}>
          {busy === "refresh" ? "Refreshing…" : "Refresh results now"}
        </button>
      </div>

      {format === "sweepstake" && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Draw</h2>
          {drawDone ? (
            <>
              <p className="notice">The draw is complete — teams are assigned.</p>
              <button
                className="danger"
                disabled={busy !== null}
                onClick={() => call("unlock", `/api/pools/${code}/unlock`)}
              >
                {busy === "unlock" ? "Clearing…" : "Unlock & clear draw"}
              </button>
            </>
          ) : (
            <>
              <p className="muted small">
                Randomly assigns all teams to players (snake order, balanced). This locks the pool and
                can’t be undone — make sure everyone has joined first.
              </p>
              <button disabled={busy !== null} onClick={() => call("draw", `/api/pools/${code}/draw`)}>
                {busy === "draw" ? "Drawing…" : "Run the draw"}
              </button>
            </>
          )}
        </div>
      )}

      {(format === "predict_lock" || format === "survivor") && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Lock</h2>
          {status === "setup" ? (
            <>
              <p className="muted small">
                {format === "predict_lock"
                  ? "Picks lock automatically at the first kickoff. Lock early if you want."
                  : "Locking marks the pool started; survivor picks still run day by day."}
              </p>
              <button
                className="secondary"
                disabled={busy !== null}
                onClick={() => call("lock", `/api/pools/${code}/lock`)}
              >
                {busy === "lock" ? "Locking…" : "Lock now"}
              </button>
            </>
          ) : (
            <>
              <p className="notice">Picks are locked.</p>
              <button
                className="secondary"
                disabled={busy !== null}
                onClick={() => call("unlock", `/api/pools/${code}/unlock`)}
              >
                {busy === "unlock" ? "Unlocking…" : "Unlock (reopen picks)"}
              </button>
            </>
          )}
        </div>
      )}

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Players ({players.length})</h2>
        {players.length === 0 ? (
          <p className="muted small">No one has joined yet.</p>
        ) : (
          <table>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.name}
                    {p.isAdmin && <span className="pill" style={{ marginLeft: 8 }}>admin</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="danger"
                      disabled={busy !== null}
                      onClick={() => call(`remove-${p.id}`, `/api/pools/${code}/remove-player`, { playerId: p.id })}
                    >
                      {busy === `remove-${p.id}` ? "Removing…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted small" style={{ marginTop: 8 }}>
          Removing a player also deletes their picks. For a sweepstake, unlock to clear the draw before
          changing the roster, then re-draw.
        </p>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Manual result override</h2>
        <p className="muted small">Fallback if the live feed lags. Enter a final score for any match.</p>
        <label>Match</label>
        <select value={feedKey} onChange={(e) => setFeedKey(e.target.value)}>
          {matches.map((m) => (
            <option key={m.feedKey} value={m.feedKey}>
              {m.label}
              {m.ft1 !== null ? ` (${m.ft1}-${m.ft2})` : ""}
            </option>
          ))}
        </select>
        <div className="row" style={{ marginTop: 10 }}>
          <div style={{ flex: "0 0 100px" }}>
            <label>Home</label>
            <input type="number" min={0} value={s1} onChange={(e) => setS1(e.target.value)} />
          </div>
          <div style={{ flex: "0 0 100px" }}>
            <label>Away</label>
            <input type="number" min={0} value={s2} onChange={(e) => setS2(e.target.value)} />
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <button
              disabled={busy !== null}
              onClick={() =>
                call("override", `/api/pools/${code}/override`, {
                  feedKey,
                  ft1: Number(s1),
                  ft2: Number(s2),
                })
              }
            >
              {busy === "override" ? "Saving…" : "Save score"}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {msg && <div className="notice" style={{ marginTop: 10 }}>{msg}</div>}
    </>
  );
}
