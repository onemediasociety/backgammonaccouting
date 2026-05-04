"use client";

import { useState, useEffect } from "react";
import type { ClubSplit, SplitRecipient } from "@/lib/splits-store";

const inputStyle: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 7, border: "1px solid var(--rule)",
  background: "var(--paper)", color: "var(--ink)", fontSize: 12,
  fontFamily: "var(--font-dm-mono, monospace)", outline: "none", boxSizing: "border-box",
};

interface ClubRow {
  clubSlug: string;
  city: string;
  flag: string;
  recipients: (SplitRecipient & { key: number })[];
  saving: boolean;
  saved: boolean;
  error: string;
}

let keyCounter = 0;
function newKey() { return ++keyCounter; }

export default function SplitsEditor() {
  const [rows, setRows] = useState<ClubRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/splits").then((r) => r.json()),
      fetch("/api/admin/clubs").then((r) => r.json()),
    ]).then(([splits, clubs]: [ClubSplit[], { slug: string; city: string; flag: string }[]]) => {
      const splitMap = Object.fromEntries(splits.map((s) => [s.clubSlug, s]));
      setRows(clubs.map((c) => {
        const existing = splitMap[c.slug]?.recipients ?? [{ name: "Global", pct: 100 }];
        return {
          clubSlug: c.slug, city: c.city, flag: c.flag,
          recipients: existing.map((r) => ({ ...r, key: newKey() })),
          saving: false, saved: false, error: "",
        };
      }));
    }).finally(() => setLoading(false));
  }, []);

  function updateRecipient(slug: string, key: number, field: "name" | "pct" | "email", value: string | number) {
    setRows((prev) => prev.map((row) => {
      if (row.clubSlug !== slug) return row;
      return {
        ...row, saved: false, error: "",
        recipients: row.recipients.map((r) => r.key === key ? { ...r, [field]: field === "pct" ? Number(value) : value } : r),
      };
    }));
  }

  function addRecipient(slug: string) {
    setRows((prev) => prev.map((row) => {
      if (row.clubSlug !== slug) return row;
      return { ...row, saved: false, recipients: [...row.recipients, { name: "", pct: 0, key: newKey() }] };
    }));
  }

  function removeRecipient(slug: string, key: number) {
    setRows((prev) => prev.map((row) => {
      if (row.clubSlug !== slug) return row;
      if (row.recipients.length <= 1) return row;
      return { ...row, saved: false, recipients: row.recipients.filter((r) => r.key !== key) };
    }));
  }

  async function saveRow(slug: string) {
    const row = rows.find((r) => r.clubSlug === slug);
    if (!row) return;
    setRows((prev) => prev.map((r) => r.clubSlug === slug ? { ...r, saving: true, error: "" } : r));
    const res = await fetch("/api/admin/splits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubSlug: slug, recipients: row.recipients.map(({ key: _, ...r }) => r) }),
    });
    const data = await res.json();
    setRows((prev) => prev.map((r) => r.clubSlug === slug
      ? { ...r, saving: false, saved: res.ok, error: res.ok ? "" : (data.error ?? "Failed to save") }
      : r
    ));
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bs-skeleton" style={{ height: 110, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {rows.map((row) => {
        const total = row.recipients.reduce((s, r) => s + (r.pct || 0), 0);
        const valid = Math.round(total) === 100 && row.recipients.every((r) => r.name.trim());
        return (
          <div key={row.clubSlug} className="bs-card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{row.flag}</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{row.city}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)",
                  padding: "2px 8px", borderRadius: 20,
                  background: Math.round(total) === 100 ? "rgba(31,77,58,0.12)" : "rgba(139,26,26,0.1)",
                  color: Math.round(total) === 100 ? "var(--bs-green, #1f4d3a)" : "var(--burgundy)",
                  border: `1px solid ${Math.round(total) === 100 ? "rgba(31,77,58,0.2)" : "rgba(139,26,26,0.2)"}`,
                }}>
                  {total}% / 100%
                </span>
                {row.error && <span style={{ fontSize: 11, color: "var(--burgundy)" }}>{row.error}</span>}
                {row.saved && <span style={{ fontSize: 11, color: "var(--bs-green, #1f4d3a)" }}>Saved ✓</span>}
                <button
                  onClick={() => saveRow(row.clubSlug)}
                  disabled={!valid || row.saving}
                  style={{
                    fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
                    padding: "5px 14px", borderRadius: 7, border: "none",
                    background: valid ? "var(--ink)" : "var(--rule)",
                    color: valid ? "var(--brass)" : "var(--ink-3)",
                    cursor: valid && !row.saving ? "pointer" : "not-allowed",
                    opacity: row.saving ? 0.6 : 1,
                  }}
                >
                  {row.saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {row.recipients.map((r) => (
                <div key={r.key} style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr auto", gap: 8, alignItems: "center" }}>
                  <input
                    placeholder="Name (e.g. Tina)"
                    value={r.name}
                    onChange={(e) => updateRecipient(row.clubSlug, r.key, "name", e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="number" min={0} max={100}
                      value={r.pct}
                      onChange={(e) => updateRecipient(row.clubSlug, r.key, "pct", e.target.value)}
                      style={{ ...inputStyle, width: 56, textAlign: "center" }}
                    />
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>%</span>
                  </div>
                  <input
                    placeholder="Email (optional, for statements)"
                    value={r.email ?? ""}
                    onChange={(e) => updateRecipient(row.clubSlug, r.key, "email", e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  />
                  <button
                    onClick={() => removeRecipient(row.clubSlug, r.key)}
                    disabled={row.recipients.length <= 1}
                    style={{
                      background: "none", border: "none", cursor: row.recipients.length > 1 ? "pointer" : "default",
                      color: "var(--burgundy)", opacity: row.recipients.length > 1 ? 0.6 : 0.2,
                      fontSize: 16, lineHeight: 1, padding: "2px 4px",
                    }}
                    title="Remove recipient"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addRecipient(row.clubSlug)}
              style={{
                marginTop: 10, fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
                padding: "4px 12px", borderRadius: 6,
                border: "1px dashed var(--rule)", background: "transparent",
                color: "var(--ink-3)", cursor: "pointer",
              }}
            >
              + Add recipient
            </button>
          </div>
        );
      })}
    </div>
  );
}
