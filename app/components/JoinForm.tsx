"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinForm({ code, poolName }: { code: string; poolName: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setError(null);
    if (!name.trim()) return setError("Enter a display name.");
    setBusy(true);
    const res = await fetch(`/api/pools/${code}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!res.ok) {
      setBusy(false);
      return setError((await res.json().catch(() => ({})))?.error ?? "Could not join.");
    }
    router.refresh();
  }

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>Join “{poolName}”</h2>
      <p className="muted small">Pick a display name so everyone can see your picks on the leaderboard.</p>
      <label htmlFor="dn">Your name</label>
      <input id="dn" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" />
      {error && <div className="error">{error}</div>}
      <div style={{ marginTop: 14 }}>
        <button onClick={join} disabled={busy}>
          {busy ? "Joining…" : "Join pool"}
        </button>
      </div>
    </div>
  );
}
