"use client";

import { useState } from "react";
import { formatAmount } from "@/lib/clubs";
import type { CashEntry } from "@/lib/cash-store";

interface Props {
  entries: CashEntry[];
  currency: string;
}

export default function CashTable({ entries, currency }: Props) {
  const [list, setList] = useState<CashEntry[]>(entries);

  async function handleDelete(id: string) {
    if (!confirm("Remove this cash entry?")) return;
    const res = await fetch(`/api/cash/${id}`, { method: "DELETE" });
    if (res.ok) setList((prev) => prev.filter((e) => e.id !== id));
  }

  if (list.length === 0) {
    return (
      <div style={{
        border: "1px dashed var(--rule)", borderRadius: 10, padding: "32px",
        textAlign: "center", color: "var(--ink-3)", fontSize: 13,
      }}>
        No cash buy-ins recorded yet.
      </div>
    );
  }

  const total = list.reduce((s, e) => s + e.totalAmount, 0);

  return (
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
          {list.map((e) => (
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
                  onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.opacity = "0.6"; }}
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
  );
}
