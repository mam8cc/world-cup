"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const FORMATS = [
  {
    id: "predict_lock",
    title: "Predict & Lock",
    desc: "Pick group winners, runners-up and the champion before kickoff. Locks at the first match, then scores itself. Least effort for everyone.",
  },
  {
    id: "sweepstake",
    title: "Sweepstake (random draw)",
    desc: "Everyone is randomly assigned teams. No picking — your teams earn points as they win and advance.",
  },
  {
    id: "survivor",
    title: "Survivor",
    desc: "Across the opening group-stage fixtures, back any team playing that day. Win to survive; last one standing wins.",
  },
] as const;

export default function CreatePool() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [format, setFormat] = useState<string>("predict_lock");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim()) return setError("Give your pool a name.");
    setBusy(true);
    const res = await fetch("/api/pools", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), format }),
    });
    if (!res.ok) {
      setBusy(false);
      return setError((await res.json().catch(() => ({})))?.error ?? "Something went wrong.");
    }
    const { code } = await res.json();
    router.push(`/pool/${code}`);
  }

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>Create a pool</h2>
      <label htmlFor="name">Pool name</label>
      <input
        id="name"
        type="text"
        placeholder="e.g. Marketing Dept World Cup"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label>Format</label>
      <div className="format-grid">
        {FORMATS.map((f) => (
          <div
            key={f.id}
            className={`format-card ${format === f.id ? "selected" : ""}`}
            onClick={() => setFormat(f.id)}
            role="button"
            tabIndex={0}
          >
            <div className="t">{f.title}</div>
            <div className="d">{f.desc}</div>
          </div>
        ))}
      </div>

      {error && <div className="error">{error}</div>}
      <div style={{ marginTop: 16 }}>
        <button onClick={submit} disabled={busy}>
          {busy ? "Creating…" : "Create pool"}
        </button>
      </div>
    </div>
  );
}
