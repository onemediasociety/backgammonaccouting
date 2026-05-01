"use client";

import { useState, useEffect } from "react";
import { formatAmount } from "@/lib/clubs";
import type { Expense } from "@/lib/expenses-store";

interface Props {
  entries: Expense[];
  currency: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  Equipment: { bg: "rgba(59,130,246,0.1)", color: "#1d4ed8" },
  Marketing:  { bg: "rgba(139,92,246,0.1)", color: "#7c3aed" },
  Venue:      { bg: "rgba(184,144,66,0.12)", color: "#8a6a2a" },
  Prizes:     { bg: "rgba(31,77,58,0.1)", color: "#1f4d3a" },
  Travel:     { bg: "rgba(99,102,241,0.1)", color: "#4f46e5" },
  Staff:      { bg: "rgba(236,72,153,0.1)", color: "#be185d" },
  Other:      { bg: "rgba(0,0,0,0.05)", color: "var(--ink-3)" },
};

export default function ExpenseTable({ entries, currency }: Props) {
  const [list, setList] = useState<Expense[]>(entries);

  useEffect(() => { setList(entries); }, [entries]);

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
            <th style={{ textAlign: "right" }}>Amount</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((e) => {
            const cat = CATEGORY_COLORS[e.category] ?? CATEGORY_COLORS.Other;
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
                <td className="bs-amount bs-amount-negative" style={{ textAlign: "right", fontSize: 13, fontWeight: 600 }}>
                  {formatAmount(e.amountCents, e.currency)}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    onClick={() => handleDelete(e.id)}
                    style={{ fontSize: 11, color: "var(--burgundy)", opacity: 0.6, background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.opacity = "1"; }}
                    onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.opacity = "0.6"; }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "2px solid var(--rule)" }}>
            <td colSpan={3} style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, color: "var(--ink-3)" }}>
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
