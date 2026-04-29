"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expense-categories";

interface Props {
  clubSlug?: string;
  currency?: string;
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

export default function AddExpenseForm({ clubSlug: defaultSlug, currency = "usd" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "Venue" as ExpenseCategory,
    description: "",
    amount: "",
    notes: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const amountCents = Math.round(Number(form.amount) * 100);
      if (!amountCents || amountCents <= 0) {
        setError("Please enter a valid amount.");
        return;
      }
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubSlug: defaultSlug,
          date: form.date,
          category: form.category,
          description: form.description,
          amountCents,
          currency,
          notes: form.notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Error ${res.status}`);
        return;
      }
      setForm({ date: new Date().toISOString().slice(0, 10), category: "Venue", description: "", amount: "", notes: "" });
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
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
        + Add Expense
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bs-card" style={{ padding: "20px", marginBottom: 16 }}>
      <h3 className="bs-heading" style={{ fontSize: 15, marginBottom: 16 }}>Record Expense</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <Field label="Date">
          <input type="date" required value={form.date} onChange={(e) => update("date", e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Category">
          <select value={form.category} onChange={(e) => update("category", e.target.value as ExpenseCategory)} style={{ ...inputStyle, cursor: "pointer" }}>
            {EXPENSE_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </Field>
        <Field label="Description" wide>
          <input type="text" required placeholder="Venue rental, tournament prizes…" value={form.description} onChange={(e) => update("description", e.target.value)} style={inputStyle} />
        </Field>
        <Field label={`Amount (${currency.toUpperCase()})`}>
          <input type="number" required min="0.01" step="0.01" placeholder="150.00" value={form.amount} onChange={(e) => update("amount", e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Notes (optional)">
          <input type="text" placeholder="Additional details" value={form.notes} onChange={(e) => update("notes", e.target.value)} style={inputStyle} />
        </Field>
      </div>

      {error && (
        <div style={{ background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "var(--burgundy)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={saving} style={{
          fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
          padding: "8px 18px", borderRadius: 8, border: "none",
          background: "var(--burgundy)", color: "#fff", cursor: "pointer",
          opacity: saving ? 0.6 : 1, fontWeight: 500,
        }}>
          {saving ? "Saving…" : "Save Expense"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(""); }} style={{
          fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
          padding: "8px 16px", borderRadius: 8,
          border: "1px solid var(--rule)", background: "var(--paper)",
          color: "var(--ink-2)", cursor: "pointer",
        }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
