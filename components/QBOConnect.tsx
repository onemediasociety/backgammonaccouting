"use client";

import { useState, useEffect } from "react";

interface QBOStatus {
  connected: boolean;
  realmId?: string;
  refreshExpiresAt?: number;
}

export default function QBOConnect({ initialError }: { initialError?: string }) {
  const [status, setStatus] = useState<QBOStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/qbo/status")
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  async function disconnect() {
    setDisconnecting(true);
    await fetch("/api/auth/qbo/status", { method: "DELETE" });
    setStatus({ connected: false });
    setDisconnecting(false);
  }

  if (loading) {
    return <div className="bs-skeleton" style={{ height: 52, borderRadius: 8 }} />;
  }

  return (
    <div>
      {initialError && (
        <div style={{ background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "var(--burgundy)" }}>
          QuickBooks error: {initialError}
        </div>
      )}
      {status?.connected ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1f4d3a", display: "inline-block" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Connected</span>
            </div>
            <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>
              Company ID: {status.realmId}
              {status.refreshExpiresAt && ` · expires ${new Date(status.refreshExpiresAt).toLocaleDateString()}`}
            </p>
          </div>
          <button
            onClick={disconnect}
            disabled={disconnecting}
            style={{ fontSize: 11, fontFamily: "var(--font-dm-mono, monospace)", padding: "5px 12px", borderRadius: 7, border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink-3)", cursor: "pointer" }}
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ink-3)", display: "inline-block" }} />
              <span style={{ fontSize: 13, color: "var(--ink-2)" }}>Not connected</span>
            </div>
            <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>
              Connect to create and send invoices directly from payouts.
            </p>
          </div>
          <a
            href="/api/auth/qbo/connect"
            style={{ fontSize: 11, fontFamily: "var(--font-dm-mono, monospace)", padding: "5px 14px", borderRadius: 7, border: "none", background: "var(--ink)", color: "var(--brass)", textDecoration: "none", letterSpacing: "0.04em" }}
          >
            Connect QuickBooks →
          </a>
        </div>
      )}
    </div>
  );
}
