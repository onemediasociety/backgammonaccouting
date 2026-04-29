"use client";

import { useState } from "react";

interface VenueMapping {
  keyword: string;
  clubSlug: string;
}

interface ClubOption {
  slug: string;
  city: string;
  flag: string;
}

interface Props {
  initial: VenueMapping[];
  clubs: ClubOption[];
}

export default function VenueManager({ initial, clubs }: Props) {
  const [venues, setVenues] = useState<VenueMapping[]>(initial);
  const [keyword, setKeyword] = useState("");
  const [clubSlug, setClubSlug] = useState(clubs[0]?.slug ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), clubSlug }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setVenues((v) => [...v, data]);
      setKeyword("");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(v: VenueMapping) {
    const res = await fetch("/api/admin/venues", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: v.keyword, clubSlug: v.clubSlug }),
    });
    if (res.ok) setVenues((prev) => prev.filter((x) => !(x.keyword === v.keyword && x.clubSlug === v.clubSlug)));
  }

  return (
    <div>
      {venues.length === 0 ? (
        <div style={{ padding: "18px 16px", textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>
          No venue mappings yet.
        </div>
      ) : (
        venues.map((v) => {
          const club = clubs.find((c) => c.slug === v.clubSlug);
          return (
            <div key={`${v.keyword}-${v.clubSlug}`} style={{ padding: "10px 16px", borderBottom: "1px solid var(--rule)", display: "flex", alignItems: "center", gap: 10 }}>
              <code style={{ flex: 1, fontSize: 12, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink)" }}>
                {v.keyword}
              </code>
              <span style={{ fontSize: 12, color: "var(--ink-2)" }}>
                {club ? `${club.flag} ${club.city}` : v.clubSlug}
              </span>
              <button
                onClick={() => handleDelete(v)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: 16, lineHeight: 1, padding: "2px 4px" }}
                title="Remove"
              >
                ×
              </button>
            </div>
          );
        })
      )}

      <form onSubmit={handleAdd} style={{ padding: "12px 16px", borderTop: venues.length > 0 ? "1px solid var(--rule)" : undefined, display: "flex", gap: 8 }}>
        <input
          type="text"
          required
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Venue keyword…"
          style={{
            flex: 1, padding: "7px 10px", borderRadius: 7,
            border: "1px solid var(--rule)", background: "var(--paper)",
            color: "var(--ink)", fontSize: 12, fontFamily: "var(--font-dm-mono, monospace)",
            outline: "none", minWidth: 0,
          }}
        />
        <select
          value={clubSlug}
          onChange={(e) => setClubSlug(e.target.value)}
          style={{
            padding: "7px 10px", borderRadius: 7,
            border: "1px solid var(--rule)", background: "var(--paper)",
            color: "var(--ink)", fontSize: 12, cursor: "pointer", outline: "none",
          }}
        >
          {clubs.map((c) => (
            <option key={c.slug} value={c.slug}>{c.flag} {c.city}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={saving}
          style={{
            fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
            padding: "7px 14px", borderRadius: 7, border: "none",
            background: "var(--ink)", color: "var(--brass)", cursor: "pointer",
            opacity: saving ? 0.6 : 1, whiteSpace: "nowrap",
          }}
        >
          + Add
        </button>
      </form>
      {error && (
        <div style={{ padding: "6px 16px", fontSize: 11, color: "var(--burgundy)" }}>{error}</div>
      )}
    </div>
  );
}
