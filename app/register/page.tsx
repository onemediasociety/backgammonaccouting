"use client";

import { useState } from "react";
import Link from "next/link";

const inputStyle: React.CSSProperties = {
  width: "100%", borderRadius: 8, border: "1px solid var(--rule)",
  padding: "9px 12px", fontSize: 13, fontFamily: "var(--font-dm-mono, monospace)",
  background: "var(--paper-2)", color: "var(--ink)", outline: "none",
  boxSizing: "border-box", transition: "border-color 150ms",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontFamily: "var(--font-dm-mono, monospace)",
  fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase",
  color: "var(--ink-3)", marginBottom: 6,
};

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed."); return; }
      window.location.href = "/pending";
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function focusBorder(e: React.FocusEvent<HTMLInputElement>, active: boolean) {
    e.target.style.borderColor = active ? "var(--brass)" : "var(--rule)";
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)",
      backgroundImage: "radial-gradient(ellipse 80% 50% at 5% 0%, rgba(184,144,66,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 95% 100%, rgba(139,26,26,0.06) 0%, transparent 50%)",
    }}>
      <div style={{ width: "100%", maxWidth: 360, padding: "0 16px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, margin: "0 auto 14px",
            background: "linear-gradient(135deg, #b89042 0%, #8a6a2a 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: 20, fontWeight: 700, color: "#fff",
          }}>BS</div>
          <h1 style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: 24, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
            Create Account
          </h1>
          <p style={{ fontFamily: "var(--font-dm-mono, monospace)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Backgammon Society · Accounting
          </p>
        </div>

        <div className="bs-card" style={{ padding: "28px 32px" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Username</label>
              <input
                type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                required autoFocus autoComplete="username" placeholder="your-name"
                style={inputStyle}
                onFocus={(e) => focusBorder(e, true)} onBlur={(e) => focusBorder(e, false)}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required autoComplete="new-password" placeholder="at least 8 characters"
                style={inputStyle}
                onFocus={(e) => focusBorder(e, true)} onBlur={(e) => focusBorder(e, false)}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Confirm Password</label>
              <input
                type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                required autoComplete="new-password" placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => focusBorder(e, true)} onBlur={(e) => focusBorder(e, false)}
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)",
                borderRadius: 7, padding: "10px 14px", marginBottom: 16,
                fontSize: 12, color: "var(--burgundy)",
              }}>{error}</div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", padding: "11px", borderRadius: 8, border: "none",
                background: "var(--ink)", color: "rgba(240,235,226,0.9)",
                fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
                fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-3)", marginTop: 16 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--brass)", textDecoration: "none" }}>Sign in</Link>
        </p>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.5 }}>
          After registering, a Society admin will assign your city before you can access the dashboard.
        </p>
      </div>
    </div>
  );
}
