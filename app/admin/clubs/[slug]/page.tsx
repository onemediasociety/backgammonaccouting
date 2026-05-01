"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
interface DynamicClub {
  slug: string;
  name: string;
  city: string;
  country: string;
  currency: string;
  flag: string;
  isBuiltIn?: boolean;
}

const CURRENCIES = ["usd", "eur", "gbp", "cad", "chf", "aud", "jpy", "mxn", "brl", "aed"];

export default function EditClubPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [club, setClub] = useState<DynamicClub | null>(null);
  const [form, setForm] = useState({ name: "", city: "", country: "", currency: "usd", flag: "🎲" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/clubs")
      .then((r) => r.json())
      .then((clubs: (DynamicClub & { isBuiltIn: boolean })[]) => {
        const found = clubs.find((c) => c.slug === slug);
        if (found) {
          setClub(found);
          setForm({ name: found.name, city: found.city, country: found.country, currency: found.currency, flag: found.flag });
        }
      })
      .catch(() => setError("Failed to load club."))
      .finally(() => setLoading(false));
  }, [slug]);

  function set(key: string, val: string) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clubs/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to update club."); return; }
      window.location.href = "/admin";
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove "${club?.city}" from the site? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/clubs/${slug}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to delete."); return; }
      window.location.href = "/admin";
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 480 }}>
        <div className="bs-skeleton" style={{ height: 12, width: 200, marginBottom: 16 }} />
        <div className="bs-skeleton" style={{ height: 28, width: 240, marginBottom: 24 }} />
        <div className="bs-skeleton" style={{ height: 200, borderRadius: 12 }} />
      </div>
    );
  }

  if (!club) {
    return (
      <div style={{ color: "var(--burgundy)", fontSize: 13 }}>
        Club not found or is a built-in club that cannot be edited this way.{" "}
        <Link href="/admin" style={{ color: "var(--brass)" }}>Back to settings</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        <Link href="/admin" style={{ color: "inherit", textDecoration: "none" }}>Settings</Link>
        {" / "}Edit City
      </p>
      <h1 className="bs-heading" style={{ fontSize: 24, marginBottom: 24 }}>Edit {club.city}</h1>

      <form onSubmit={handleSubmit}>
        <div className="bs-card" style={{ padding: "20px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="City Name">
            <input type="text" required value={form.city} autoFocus onChange={(e) => set("city", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Club Full Name">
            <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} style={inputStyle} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Country Code">
              <input type="text" value={form.country} onChange={(e) => set("country", e.target.value.toUpperCase())} style={inputStyle} maxLength={3} />
            </Field>
            <Field label="Currency">
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Flag / Emoji">
            <input type="text" value={form.flag} onChange={(e) => set("flag", e.target.value)} style={{ ...inputStyle, fontSize: 20, textAlign: "center", width: 60 }} />
          </Field>
        </div>

        {error && (
          <div style={{ background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--burgundy)" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button type="submit" disabled={saving} style={{
            fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
            padding: "9px 20px", borderRadius: 8, border: "none",
            background: "var(--ink)", color: "var(--brass)", cursor: "pointer",
            opacity: saving ? 0.6 : 1,
          }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <Link href="/admin" style={{
            fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
            padding: "9px 20px", borderRadius: 8,
            border: "1px solid var(--rule)", color: "var(--ink-2)",
            textDecoration: "none", display: "inline-flex", alignItems: "center",
          }}>
            Cancel
          </Link>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={handleDelete} disabled={deleting} style={{
            fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
            padding: "7px 14px", borderRadius: 8,
            border: "1px solid rgba(139,26,26,0.25)", background: "none",
            color: "var(--burgundy)", cursor: "pointer",
            opacity: deleting ? 0.6 : 1,
          }}>
            {deleting ? "Removing…" : "Remove City"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--rule)", background: "var(--paper)",
  color: "var(--ink)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
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
