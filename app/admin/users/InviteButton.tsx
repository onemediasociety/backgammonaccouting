"use client";

import { useState } from "react";

export default function InviteButton({ userId, username }: { userId: string; username: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setState("loading");
    try {
      const res = await fetch(`/api/admin/users/${userId}/invite`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setInviteUrl(data.inviteUrl);
      setState("done");
    } catch {
      setState("idle");
      alert("Failed to generate invite link.");
    }
  }

  function copy() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function mailtoLink() {
    const subject = encodeURIComponent("Your Backgammon Society admin account is ready");
    const body = encodeURIComponent(
      `Hi ${username},\n\nYou've been invited to set up your Backgammon Society accounting account.\n\nClick the link below to create your password and complete your profile:\n\n${inviteUrl}\n\nThis link expires in 7 days.\n\nWelcome aboard!`
    );
    return `mailto:?subject=${subject}&body=${body}`;
  }

  if (state === "idle" || state === "loading") {
    return (
      <button
        onClick={generate}
        disabled={state === "loading"}
        style={{
          fontSize: 11, fontFamily: "var(--font-dm-mono, monospace)",
          color: "var(--brass)", textDecoration: "none",
          padding: "3px 8px", border: "1px solid rgba(184,144,66,0.35)", borderRadius: 6,
          background: "rgba(184,144,66,0.07)", cursor: state === "loading" ? "wait" : "pointer",
          opacity: state === "loading" ? 0.6 : 1,
        }}
      >
        {state === "loading" ? "…" : "Invite"}
      </button>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 6,
      padding: "10px 12px", background: "var(--paper-2)",
      border: "1px solid var(--rule)", borderRadius: 8, minWidth: 260,
    }}>
      <p style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink-3)", marginBottom: 2 }}>
        Invite link (expires in 7 days)
      </p>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          readOnly value={inviteUrl}
          style={{
            flex: 1, fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)",
            padding: "5px 8px", borderRadius: 6, border: "1px solid var(--rule)",
            background: "var(--paper)", color: "var(--ink)", outline: "none",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={copy}
          style={{
            fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)",
            padding: "5px 10px", borderRadius: 6, border: "none",
            background: copied ? "var(--bs-green, #1f4d3a)" : "var(--ink)",
            color: copied ? "#fff" : "var(--brass)", cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <a
          href={mailtoLink()}
          style={{
            fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)",
            padding: "4px 10px", borderRadius: 6,
            border: "1px solid rgba(184,144,66,0.35)",
            color: "var(--brass)", textDecoration: "none",
            background: "rgba(184,144,66,0.07)",
          }}
        >
          Open in Email ↗
        </a>
        <button
          onClick={() => setState("idle")}
          style={{
            fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)",
            padding: "4px 10px", borderRadius: 6,
            border: "1px solid var(--rule)", background: "none",
            color: "var(--ink-3)", cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
