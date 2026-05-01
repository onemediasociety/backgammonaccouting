"use client";

import { useState } from "react";
import Link from "next/link";

const CURRENCIES = ["usd", "eur", "gbp", "cad", "chf", "aud", "jpy", "mxn", "brl", "aed"];

export default function NewClubPage() {
  const [form, setForm] = useState({ slug: "", name: "", city: "", country: "", currency: "usd", flag: "🎲", ticketPrice: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set(key: string, val: string) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ticketCents: form.ticketPrice ? Math.round(parseFloat(form.ticketPrice) * 100) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create club."); return; }
      window.location.href = "/admin";
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        <Link href="/admin" style={{ color: "inherit", textDecoration: "none" }}>Settings</Link>
        {" / "}Add City
      </p>
      <h1 className="bs-heading" style={{ fontSize: 24, marginBottom: 24 }}>Add New City</h1>

      <form onSubmit={handleSubmit}>
        <div className="bs-card" style={{ padding: "20px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="City Name">
            <input type="text" required value={form.city} autoFocus onChange={(e) => set("city", e.target.value)} style={inputStyle} placeholder="Los Angeles" />
          </Field>
          <Field label="Club Full Name">
            <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} style={inputStyle} placeholder="LA Backgammon Club" />
          </Field>
          <Field label="URL Slug (no spaces)">
            <input type="text" required value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} style={inputStyle} placeholder="la" />
            {form.slug && (
              <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>
                Will be accessible at: /clubs/{form.slug}
              </p>
            )}
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Country Code">
              <input type="text" value={form.country} onChange={(e) => set("country", e.target.value.toUpperCase())} style={inputStyle} placeholder="US" maxLength={3} />
            </Field>
            <Field label="Currency">
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Flag / Emoji">
              <input type="text" value={form.flag} onChange={(e) => set("flag", e.target.value)} style={{ ...inputStyle, fontSize: 20, textAlign: "center" }} />
            </Field>
            <Field label="Ticket Price (optional)">
              <input type="number" min="0" step="0.01" value={form.ticketPrice} onChange={(e) => set("ticketPrice", e.target.value)} style={inputStyle} placeholder="25.00" />
            </Field>
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--burgundy)" }}>
            {error}
          </div>
        )}

        <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 16, lineHeight: 1.5 }}>
          Note: New cities start as cash-only. Stripe payment matching must be configured in code by linking a Stripe product ID.
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving} style={{
            fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
            padding: "9px 20px", borderRadius: 8, border: "none",
            background: "var(--ink)", color: "var(--brass)", cursor: "pointer",
            opacity: saving ? 0.6 : 1,
          }}>
            {saving ? "Creating…" : "Add City"}
          </button>
          <Link href="/admin" style={{
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
