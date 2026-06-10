"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinExisting() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>Join a pool</h2>
      <div className="row">
        <div>
          <label htmlFor="code">Pool code</label>
          <input
            id="code"
            type="text"
            placeholder="e.g. kq7m2x"
            value={code}
            onChange={(e) => setCode(e.target.value.trim().toLowerCase())}
          />
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <button className="secondary" onClick={() => code && router.push(`/pool/${code}`)}>
            Go
          </button>
        </div>
      </div>
    </div>
  );
}
