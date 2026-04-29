"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CLUBS } from "@/lib/clubs";

export default function NewUserPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "", clubSlugs: [] as string[] });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
    if (form.clubSlugs.length === 0) {
      setError("Assign at least one club.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create user."); return; }
      router.push("/admin/users");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        <Link href="/admin" style={{ color: "inherit", textDecoration: "none" }}>Settings</Link>
        {" / "}
        <Link href="/admin/users" style={{ color: "inherit", textDecoration: "none" }}>Users</Link>
        {" / "}New
      </p>
      <h1 className="bs-heading" style={{ fontSize: 24, marginBottom: 24 }}>Create Admin User</h1>

      <form onSubmit={handleSubmit}>
        <div className="bs-card" style={{ padding: "20px", marginBottom: 16 }}>
          <Field label="Username">
            <input
              type="text" required value={form.username} autoFocus
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              style={inputStyle}
              placeholder="alice"
            />
          </Field>
          <div style={{ marginTop: 16 }}>
            <Field label="Password">
              <input
                type="password" required value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                style={inputStyle}
                placeholder="••••••••"
              />
            </Field>
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
            {saving ? "Creating…" : "Create User"}
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
