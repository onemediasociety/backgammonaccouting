"use client";

import { useState, useEffect } from "react";
import { formatAmount } from "@/lib/clubs";
import type { CashEntry } from "@/lib/cash-store";

interface Props {
  initialEntries: CashEntry[];
  clubSlug: string;
  currency: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--rule)", background: "var(--paper)",
  color: "var(--ink)", fontSize: 13, fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={wide ? { gridColumn: "1 / -1" } : {}}>
      <label style={{ display: "block", fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function CashSection({ initialEntries, clubSlug, currency }: Props) {
  const [entries, setEntries] = useState<CashEntry[]>(initialEntries);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Always re-fetch from API on mount to get persisted data, regardless of
  // what the server rendered (Vercel serverless instances may have stale file state)
  useEffect(() => {
    fetch(`/api/cash?club=${encodeURIComponent(clubSlug)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: CashEntry[] | null) => { if (data) setEntries(data); })
      .catch(() => {});
  }, [clubSlug]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    event: "",
    playerCount: "",
    buyInAmount: "",
    notes: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this cash entry?")) return;
    const res = await fetch(`/api/cash/${id}`, { method: "DELETE" });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const playerCount = Number(form.playerCount);
    const buyInAmount = Math.round(Number(form.buyInAmount) * 100);

    if (!playerCount || playerCount <= 0) {
      setError("Please enter a valid number of players.");
      return;
    }
    if (!buyInAmount || buyInAmount <= 0) {
      setError("Please enter a valid buy-in amount.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubSlug,
          currency,
          date: form.date,
          event: form.event,
          playerCount,
          buyInAmount,
          notes: form.notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Error ${res.status}`);
        return;
      }

      const newEntry: CashEntry = await res.json();
      setEntries((prev) => [newEntry, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      setForm({
        date: new Date().toISOString().slice(0, 10),
        event: "",
        playerCount: "",
        buyInAmount: "",
        notes: "",
      });
      setOpen(false);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  const total = entries.reduce((s, e) => s + e.totalAmount, 0);
  const preview = form.playerCount && form.buyInAmount
    ? Number(form.playerCount) * Number(form.buyInAmount)
    : null;

  return (
    <>
      {/* Add form */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
            padding: "8px 16px", borderRadius: 8,
            border: "1px solid rgba(139,26,26,0.3)",
            background: "rgba(139,26,26,0.07)", color: "var(--burgundy)",
            cursor: "pointer", fontWeight: 500, letterSpacing: "0.04em",
          }}
        >
          + Add Cash Buy-in
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bs-card" style={{ padding: "20px", marginBottom: 16 }}>
          <h3 className="bs-heading" style={{ fontSize: 15, marginBottom: 16 }}>Record Cash Buy-in</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <Field label="Date">
              <input type="date" required value={form.date} onChange={(e) => update("date", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Event Name">
              <input type="text" required placeholder="Tuesday Night Tournament" value={form.event} onChange={(e) => update("event", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Number of Cash Players">
              <input type="number" required min={1} placeholder="8" value={form.playerCount} onChange={(e) => update("playerCount", e.target.value)} style={inputStyle} />
            </Field>
            <Field label={`Buy-in Amount (${currency.toUpperCase()})`}>
              <input type="number" required min={0.01} step="0.01" placeholder="25.00" value={form.buyInAmount} onChange={(e) => update("buyInAmount", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Notes (optional)" wide>
              <input type="text" placeholder="Any notes about this session" value={form.notes} onChange={(e) => update("notes", e.target.value)} style={inputStyle} />
            </Field>
          </div>

          {preview !== null && (
            <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12, fontFamily: "var(--font-dm-mono, monospace)" }}>
              Total: <strong style={{ color: "var(--ink)" }}>{currency.toUpperCase()} {preview.toFixed(2)}</strong>
            </p>
          )}

          {error && (
            <div style={{ background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "var(--burgundy)" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
                padding: "8px 18px", borderRadius: 8, border: "none",
                background: "var(--burgundy)", color: "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1, fontWeight: 500,
              }}
            >
              {saving ? "Saving…" : "Save Entry"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(""); }}
              style={{
                fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
                padding: "8px 16px", borderRadius: 8,
                border: "1px solid var(--rule)", background: "var(--paper)",
                color: "var(--ink-2)", cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div style={{ marginTop: 16 }}>
        {entries.length === 0 ? (
          <div style={{
            border: "1px dashed var(--rule)", borderRadius: 10, padding: "32px",
            textAlign: "center", color: "var(--ink-3)", fontSize: 13,
          }}>
            No cash buy-ins recorded yet.
          </div>
        ) : (
          <div className="bs-card" style={{ overflow: "hidden" }}>
            <table className="bs-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th style={{ textAlign: "right" }}>Players</th>
                  <th style={{ textAlign: "right" }}>Buy-in</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="bs-mono" style={{ fontSize: 12 }}>{e.date}</td>
                    <td>
                      <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{e.event}</div>
                      {e.notes && <div className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{e.notes}</div>}
                    </td>
                    <td className="bs-amount" style={{ textAlign: "right", fontSize: 12 }}>{e.playerCount}</td>
                    <td className="bs-amount" style={{ textAlign: "right", fontSize: 12, color: "var(--ink-3)" }}>
                      {formatAmount(e.buyInAmount, e.currency)}
                    </td>
                    <td className="bs-amount" style={{ textAlign: "right", fontSize: 13, fontWeight: 600 }}>
                      {formatAmount(e.totalAmount, e.currency)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        onClick={() => handleDelete(e.id)}
                        style={{ fontSize: 11, color: "var(--burgundy)", opacity: 0.6, background: "none", border: "none", cursor: "pointer" }}
                        onMouseEnter={(ev) => { (ev.target as HTMLButtonElement).style.opacity = "1"; }}
                        onMouseLeave={(ev) => { (ev.target as HTMLButtonElement).style.opacity = "0.6"; }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--rule)" }}>
                  <td colSpan={4} style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, color: "var(--ink-3)" }}>
                    Total Cash
                  </td>
                  <td className="bs-amount" style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>
                    {formatAmount(total, currency)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
