"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { withFlag } from "@/lib/flags";

type Existing = { kind: string; slot: string; team: string };

export default function PredictForm({
  code,
  groups,
  allTeams,
  existing,
  open,
}: {
  code: string;
  groups: Record<string, string[]>;
  allTeams: string[];
  existing: Existing[];
  open: boolean;
}) {
  const router = useRouter();
  const init = (kind: string, slot: string) =>
    existing.find((e) => e.kind === kind && e.slot === slot)?.team ?? "";

  const [first, setFirst] = useState<Record<string, string>>(
    Object.fromEntries(Object.keys(groups).map((g) => [g, init("group_1st", g)])),
  );
  const [second, setSecond] = useState<Record<string, string>>(
    Object.fromEntries(Object.keys(groups).map((g) => [g, init("group_2nd", g)])),
  );
  const [champion, setChampion] = useState(init("champion", "champion"));
  const [goldenBoot, setGoldenBoot] = useState(init("golden_boot", "golden_boot"));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setMsg(null);
    const picks: Existing[] = [];
    for (const g of Object.keys(groups)) {
      if (first[g] && second[g] && first[g] === second[g]) {
        return setError(`Group ${g}: 1st and 2nd must be different teams.`);
      }
      if (first[g]) picks.push({ kind: "group_1st", slot: g, team: first[g] });
      if (second[g]) picks.push({ kind: "group_2nd", slot: g, team: second[g] });
    }
    if (champion) picks.push({ kind: "champion", slot: "champion", team: champion });
    if (goldenBoot.trim()) picks.push({ kind: "golden_boot", slot: "golden_boot", team: goldenBoot.trim() });

    setBusy(true);
    const res = await fetch(`/api/pools/${code}/predictions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ picks }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({})))?.error ?? "Could not save.");
    setMsg("Picks saved.");
    router.refresh();
  }

  if (!open) {
    return (
      <div className="notice">
        Picks are locked (the tournament has started). Your saved predictions are shown below and
        scored automatically.
      </div>
    );
  }

  return (
    <div>
      <p className="muted small">
        Pick the top two of each group, the champion, and (optional) the golden boot top scorer. You
        can edit any time until the first match kicks off.
      </p>

      <h2>Groups</h2>
      {Object.entries(groups).map(([g, teams]) => (
        <div key={g} className="group-pick">
          <div className="g">Grp {g}</div>
          <select value={first[g]} onChange={(e) => setFirst({ ...first, [g]: e.target.value })}>
            <option value="">1st place…</option>
            {teams
              .filter((t) => t !== second[g])
              .map((t) => (
                <option key={t} value={t}>
                  {withFlag(t)}
                </option>
              ))}
          </select>
          <select value={second[g]} onChange={(e) => setSecond({ ...second, [g]: e.target.value })}>
            <option value="">2nd place…</option>
            {teams
              .filter((t) => t !== first[g])
              .map((t) => (
                <option key={t} value={t}>
                  {withFlag(t)}
                </option>
              ))}
          </select>
        </div>
      ))}

      <h2>Champion & golden boot</h2>
      <label>Champion</label>
      <select value={champion} onChange={(e) => setChampion(e.target.value)}>
        <option value="">Pick the winner…</option>
        {allTeams.map((t) => (
          <option key={t} value={t}>
            {withFlag(t)}
          </option>
        ))}
      </select>
      <label>Golden boot (top scorer) — optional</label>
      <input
        type="text"
        value={goldenBoot}
        onChange={(e) => setGoldenBoot(e.target.value)}
        placeholder="Player name, e.g. Kylian Mbappé"
      />

      {error && <div className="error">{error}</div>}
      {msg && <div className="notice" style={{ marginTop: 10 }}>{msg}</div>}
      <div style={{ marginTop: 16 }}>
        <button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save picks"}
        </button>
      </div>
    </div>
  );
}
