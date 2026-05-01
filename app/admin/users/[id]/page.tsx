"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CLUBS } from "@/lib/clubs";
import type { SafeUser } from "@/lib/users-store";

export default function EditUserPage() {
  const params = useParams();
  const id = params.id as string;

  const [user, setUser] = useState<SafeUser | null>(null);
  const [form, setForm] = useState({ username: "", password: "", clubSlugs: [] as string[], status: "active" as "active" | "pending", recipientName: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((u: SafeUser) => {
        setUser(u);
        setForm({ username: u.username, password: "", clubSlugs: u.clubSlugs, status: u.status ?? "active", recipientName: u.recipientName ?? "" });
      })
      .catch(() => setError("Failed to load user."))
      .finally(() => setLoading(false));
  }, [id]);

  function toggleClub(slug: string) {
    setForm((prev) => ({
      ...prev,
      clubSlugs: prev.clubSlugs.includes(slug)
        ? prev.clubSlugs.filter((s) => s !== slug)
        : [...prev.clubSlugs, slug],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, password: form.password || undefined, clubSlugs: form.clubSlugs, status: form.status, recipientName: form.recipientName || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to update user."); return; }
      window.location.href = "/admin/users";
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 480 }}>
        <div className="bs-skeleton" style={{ height: 12, width: 200, marginBottom: 16 }} />
        <div className="bs-skeleton" style={{ height: 28, width: 240, marginBottom: 24 }} />
        <div className="bs-skeleton" style={{ height: 120, borderRadius: 12 }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ color: "var(--burgundy)", fontSize: 13 }}>
        User not found. <Link href="/admin/users" style={{ color: "var(--brass)" }}>Back to users</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        <Link href="/admin" style={{ color: "inherit", textDecoration: "none" }}>Settings</Link>
        {" / "}
        <Link href="/admin/users" style={{ color: "inherit", textDecoration: "none" }}>Users</Link>
        {" / "}Edit
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <h1 className="bs-heading" style={{ fontSize: 24 }}>Edit {user.username}</h1>
        {form.status === "pending" && (
          <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", padding: "3px 10px", borderRadius: 20, background: "rgba(184,144,66,0.12)", color: "var(--brass)", border: "1px solid rgba(184,144,66,0.3)" }}>
            PENDING
          </span>
        )}
      </div>

      {form.status === "pending" && (
        <div style={{ background: "rgba(184,144,66,0.07)", border: "1px solid rgba(184,144,66,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "var(--ink-2)" }}>
          This account is waiting for approval. Assign cities below and set status to <strong>Active</strong> to grant access.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bs-card" style={{ padding: "20px", marginBottom: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
              Account Status
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["active", "pending"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, status: s }))}
                  style={{
                    padding: "6px 16px", borderRadius: 7, fontSize: 11,
                    fontFamily: "var(--font-dm-mono, monospace)", cursor: "pointer",
                    border: form.status === s ? "none" : "1px solid var(--rule)",
                    background: form.status === s ? (s === "active" ? "var(--bs-green, #1f4d3a)" : "var(--burgundy)") : "var(--paper)",
                    color: form.status === s ? "#fff" : "var(--ink-3)",
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <Field label="Username">
            <input
              type="text" required value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              style={inputStyle}
            />
          </Field>
          <div style={{ marginTop: 16 }}>
            <Field label="New Password (leave blank to keep existing)">
              <input
                type="password" value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                style={inputStyle}
                placeholder="••••••••"
              />
            </Field>
          </div>
          <div style={{ marginTop: 16 }}>
            <Field label="Recipient Name (links to payout split)">
              <input
                type="text" value={form.recipientName}
                onChange={(e) => setForm((p) => ({ ...p, recipientName: e.target.value }))}
                style={inputStyle}
                placeholder="e.g. Tina — must match name in splits config"
              />
            </Field>
            <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 5, fontFamily: "var(--font-dm-mono, monospace)" }}>
              Must exactly match the recipient name in Settings → Revenue Splits
            </p>
          </div>
        </div>

        <div className="bs-card" style={{ overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule)" }}>
            <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Assigned Clubs
            </p>
          </div>
          {CLUBS.map((club) => (
            <label key={club.slug} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--rule)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.clubSlugs.includes(club.slug)}
                onChange={() => toggleClub(club.slug)}
                style={{ accentColor: "var(--brass)" }}
              />
              <span style={{ fontSize: 18 }}>{club.flag}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{club.name}</div>
                <div className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{club.city} · {club.currency.toUpperCase()}</div>
              </div>
            </label>
          ))}
        </div>

        {error && (
          <div style={{ background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--burgundy)" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving} style={{
            fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
            padding: "9px 20px", borderRadius: 8, border: "none",
            background: "var(--ink)", color: "var(--brass)", cursor: "pointer",
            opacity: saving ? 0.6 : 1,
          }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <Link href="/admin/users" style={{
            fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
            padding: "9px 20px", borderRadius: 8,
            border: "1px solid var(--rule)", color: "var(--ink-2)",
            textDecoration: "none", display: "inline-flex", alignItems: "center",
          }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--rule)", background: "var(--paper)",
  color: "var(--ink)", fontSize: 13,
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
