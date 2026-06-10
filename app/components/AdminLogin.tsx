"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({})))?.error ?? "Login failed.");
    router.refresh();
  }

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>Admin sign-in</h2>
      {configured ? (
        <>
          <p className="muted small">Enter the site admin key to view all pools.</p>
          <label htmlFor="key">Admin key</label>
          <input
            id="key"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {error && <div className="error">{error}</div>}
          <div style={{ marginTop: 14 }}>
            <button onClick={submit} disabled={busy}>
              {busy ? "Checking…" : "Sign in"}
            </button>
          </div>
        </>
      ) : (
        <div className="notice">
          The admin area isn’t configured. Set an <code>ADMIN_KEY</code> environment variable to enable it.
        </div>
      )}
    </div>
  );
}
