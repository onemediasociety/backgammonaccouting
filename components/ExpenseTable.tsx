"use client";

import { useState, useEffect } from "react";
import { formatAmount } from "@/lib/clubs";
import type { Expense } from "@/lib/expenses-store";
import { EXPENSE_CATEGORIES } from "@/lib/expenses-store";
import type { ExpenseCategory } from "@/lib/expenses-store";

interface Props {
  entries: Expense[];
  currency: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  Equipment: { bg: "rgba(59,130,246,0.1)",    color: "#1d4ed8" },
  Marketing:  { bg: "rgba(139,92,246,0.1)",   color: "#7c3aed" },
  Venue:      { bg: "rgba(184,144,66,0.12)",  color: "#8a6a2a" },
  Prizes:     { bg: "rgba(31,77,58,0.1)",     color: "#1f4d3a" },
  Travel:     { bg: "rgba(99,102,241,0.1)",   color: "#4f46e5" },
  Staff:      { bg: "rgba(236,72,153,0.1)",   color: "#be185d" },
  Other:      { bg: "rgba(0,0,0,0.05)",       color: "var(--ink-3)" },
};

const inputSt: React.CSSProperties = {
  padding: "5px 8px", borderRadius: 6, border: "1px solid var(--rule)",
  background: "var(--paper)", color: "var(--ink)", fontSize: 12,
  fontFamily: "var(--font-dm-mono, monospace)", outline: "none", width: "100%", boxSizing: "border-box",
};

interface EditState {
  date: string;
  category: ExpenseCategory;
  description: string;
  paidBy: string;
  amountStr: string;
  notes: string;
}

function toEditState(e: Expense): EditState {
  return {
    date: e.date,
    category: e.category,
    description: e.description,
    paidBy: e.paidBy ?? "",
    amountStr: (e.amountCents / 100).toFixed(2),
    notes: e.notes ?? "",
  };
}

export default function ExpenseTable({ entries, currency }: Props) {
  const [list, setList] = useState<Expense[]>(entries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setList(entries); }, [entries]);

  function startEdit(e: Expense) {
    setEditingId(e.id);
    setEditState(toEditState(e));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  async function saveEdit(id: string) {
    if (!editState) return;
    setSaving(true);
    const amountCents = Math.round(parseFloat(editState.amountStr) * 100);
    const res = await fetch(`/api/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editState.date,
        category: editState.category,
        description: editState.description,
        paidBy: editState.paidBy,
        amountCents,
        notes: editState.notes,
      }),
    });
    if (res.ok) {
      const updated: Expense = await res.json();
      setList((prev) => prev.map((e) => e.id === id ? updated : e));
      setEditingId(null);
      setEditState(null);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this expense?")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) setList((prev) => prev.filter((e) => e.id !== id));
  }

  if (list.length === 0) {
    return (
      <div style={{
        border: "1px dashed var(--rule)", borderRadius: 10, padding: "32px",
        textAlign: "center", color: "var(--ink-3)", fontSize: 13,
      }}>
        No expenses recorded yet.
      </div>
    );
  }

  const total = list.reduce((s, e) => s + e.amountCents, 0);

  return (
    <div className="bs-card" style={{ overflow: "hidden" }}>
      <table className="bs-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Paid By</th>
            <th style={{ textAlign: "right" }}>Amount</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((e) => {
            const cat = CATEGORY_COLORS[e.category] ?? CATEGORY_COLORS.Other;
            const isEditing = editingId === e.id;

            if (isEditing && editState) {
              return (
                <tr key={e.id} style={{ background: "rgba(184,144,66,0.04)" }}>
                  <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                    <input type="date" value={editState.date}
                      onChange={(ev) => setEditState({ ...editState, date: ev.target.value })}
                      style={{ ...inputSt, width: 130 }} />
                  </td>
                  <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                    <select value={editState.category}
                      onChange={(ev) => setEditState({ ...editState, category: ev.target.value as ExpenseCategory })}
                      style={{ ...inputSt }}>
                      {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                    <input value={editState.description}
                      onChange={(ev) => setEditState({ ...editState, description: ev.target.value })}
                      style={{ ...inputSt, marginBottom: 4 }} placeholder="Description" />
                    <input value={editState.notes}
                      onChange={(ev) => setEditState({ ...editState, notes: ev.target.value })}
                      style={{ ...inputSt, fontSize: 10 }} placeholder="Notes (optional)" />
                  </td>
                  <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                    <input value={editState.paidBy}
                      onChange={(ev) => setEditState({ ...editState, paidBy: ev.target.value })}
                      style={{ ...inputSt }} placeholder="Paid by" />
                  </td>
                  <td style={{ padding: "10px 12px", verticalAlign: "top", textAlign: "right" }}>
                    <input type="number" min="0" step="0.01" value={editState.amountStr}
                      onChange={(ev) => setEditState({ ...editState, amountStr: ev.target.value })}
                      style={{ ...inputSt, width: 90, textAlign: "right" }} />
                  </td>
                  <td style={{ padding: "10px 12px", verticalAlign: "top", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button onClick={() => saveEdit(e.id)} disabled={saving}
                      style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: "var(--bs-green, #1f4d3a)", color: "#fff", cursor: "pointer", marginRight: 6, opacity: saving ? 0.6 : 1 }}>
                      {saving ? "…" : "Save"}
                    </button>
                    <button onClick={cancelEdit}
                      style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--rule)", background: "none", color: "var(--ink-3)", cursor: "pointer" }}>
                      Cancel
                    </button>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={e.id}>
                <td className="bs-mono" style={{ fontSize: 12 }}>{e.date}</td>
                <td>
                  <span style={{
                    display: "inline-block", padding: "2px 8px", borderRadius: 20,
                    fontFamily: "var(--font-dm-mono, monospace)", fontSize: 10,
                    background: cat.bg, color: cat.color,
                  }}>
                    {e.category}
                  </span>
                </td>
                <td>
                  <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{e.description}</div>
                  {e.notes && <div className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{e.notes}</div>}
                  {e.receiptUrl && (
                    <a href={e.receiptUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "var(--brass)", fontFamily: "var(--font-dm-mono, monospace)", textDecoration: "none" }}>
                      View receipt ↗
                    </a>
                  )}
                </td>
                <td className="bs-mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>
                  {e.paidBy || <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>—</span>}
                </td>
                <td className="bs-amount bs-amount-negative" style={{ textAlign: "right", fontSize: 13, fontWeight: 600 }}>
                  {formatAmount(e.amountCents, e.currency)}
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button onClick={() => startEdit(e)}
                    style={{ fontSize: 11, color: "var(--brass)", opacity: 0.7, background: "none", border: "none", cursor: "pointer", marginRight: 8 }}
                    onMouseEnter={(ev) => { (ev.target as HTMLButtonElement).style.opacity = "1"; }}
                    onMouseLeave={(ev) => { (ev.target as HTMLButtonElement).style.opacity = "0.7"; }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(e.id)}
                    style={{ fontSize: 11, color: "var(--burgundy)", opacity: 0.6, background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={(ev) => { (ev.target as HTMLButtonElement).style.opacity = "1"; }}
                    onMouseLeave={(ev) => { (ev.target as HTMLButtonElement).style.opacity = "0.6"; }}>
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid var(--rule)" }}>
            <td colSpan={4} style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, color: "var(--ink-3)" }}>
              Total Expenses
            </td>
            <td className="bs-amount bs-amount-negative" style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>
              {formatAmount(total, currency)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
