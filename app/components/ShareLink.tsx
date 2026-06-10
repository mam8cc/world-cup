"use client";

import { useState } from "react";

export default function ShareLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/pool/${code}` : `/pool/${code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  }

  return (
    <div className="share">
      <code>{url}</code>
      <button className="secondary" onClick={copy} style={{ flex: "0 0 auto" }}>
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
