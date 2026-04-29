"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        setError("Invalid credentials. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)",
      backgroundImage: "radial-gradient(ellipse 80% 50% at 5% 0%, rgba(184,144,66,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 95% 100%, rgba(139,26,26,0.06) 0%, transparent 50%)",
    }}>
      <div style={{ width: "100%", maxWidth: 360, padding: "0 16px" }}>
        {/* Logo card */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, margin: "0 auto 14px",
            background: "linear-gradient(135deg, #b89042 0%, #8a6a2a 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: 20, fontWeight: 700, color: "#fff",
          }}>
            BS
          </div>
          <h1 style={{
            fontFamily: "var(--font-cormorant, Georgia, serif)",
            fontSize: 24, fontWeight: 700, color: "var(--ink)", marginBottom: 4,
          }}>
            The Backgammon Society
          </h1>
          <p style={{
            fontFamily: "var(--font-dm-mono, monospace)",
            fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            Accounting Dashboard
          </p>
        </div>

        {/* Form card */}
        <div className="bs-card" style={{ padding: "28px 32px" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontFamily: "var(--font-dm-mono, monospace)", fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                placeholder="admin"
                style={{
                  width: "100%", borderRadius: 8, border: "1px solid var(--rule)",
                  padding: "9px 12px", fontSize: 13, fontFamily: "var(--font-dm-mono, monospace)",
                  background: "var(--paper-2)", color: "var(--ink)", outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 150ms",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--brass)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--rule)"; }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontFamily: "var(--font-dm-mono, monospace)", fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: "100%", borderRadius: 8, border: "1px solid var(--rule)",
                  padding: "9px 12px", fontSize: 13, fontFamily: "var(--font-dm-mono, monospace)",
                  background: "var(--paper-2)", color: "var(--ink)", outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 150ms",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--brass)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--rule)"; }}
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)",
                borderRadius: 7, padding: "10px 14px", marginBottom: 16,
                fontSize: 12, color: "var(--burgundy)",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "11px", borderRadius: 8, border: "none",
                background: "var(--ink)", color: "rgba(240,235,226,0.9)",
                fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
                fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = "var(--ink-2)"; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "var(--ink)"; }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--ink-3)", marginTop: 16 }}>
          Super admins: username{" "}
          <span style={{ fontFamily: "var(--font-dm-mono, monospace)", background: "var(--paper-2)", padding: "1px 5px", borderRadius: 3 }}>admin</span>
          {" "}+ site password
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
