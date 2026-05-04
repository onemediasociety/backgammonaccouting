"use client";

import { useState } from "react";
import { formatAmount, CLUBS } from "@/lib/clubs";
import type { PaymentRecord } from "@/lib/stripe-client";

const PAGE_SIZE = 10;

interface Props {
  payments: PaymentRecord[];
  currency: string;
}

export default function TransactionTable({ payments, currency }: Props) {
  const [showing, setShowing] = useState(PAGE_SIZE);

  if (payments.length === 0) {
    return (
      <div style={{
        border: "1px dashed var(--rule)", borderRadius: 10, padding: "32px",
        textAlign: "center", color: "var(--ink-3)", fontSize: 13,
      }}>
        No Stripe payments found for this period.
      </div>
    );
  }

  const succeeded = payments.filter((p) => p.status === "succeeded");
  const visible = succeeded.slice(0, showing);
  const hasMore = showing < succeeded.length;
  const remaining = succeeded.length - showing;

  return (
    <div>
      <div className="bs-card" style={{ overflow: "hidden" }}>
        <table className="bs-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Description</th>
              <th style={{ textAlign: "right" }}>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr
                key={p.id}
                onClick={() => p.receiptUrl && window.open(p.receiptUrl, "_blank", "noopener")}
                style={{ cursor: p.receiptUrl ? "pointer" : undefined }}
                title={p.receiptUrl ? "Open Stripe receipt" : undefined}
              >
                <td className="bs-mono" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                  {new Date(p.created * 1000).toLocaleDateString("en-US", {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </td>
                <td style={{ fontSize: 13, color: "var(--ink-2)" }}>
                  {p.customerName ?? (
                    <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>—</span>
                  )}
                </td>
                <td style={{ fontSize: 13, color: "var(--ink-3)" }}>
                  {p.description ?? CLUBS.find((c) => c.slug === p.clubSlug)?.name ?? "Online buy-in"}
                </td>
                <td className="bs-amount" style={{ textAlign: "right", fontSize: 13 }}>
                  {formatAmount(p.amount, p.currency)}
                </td>
                <td>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "2px 8px", borderRadius: 20,
                    fontFamily: "var(--font-dm-mono, monospace)", fontSize: 10,
                    background: p.status === "succeeded" ? "rgba(31,77,58,0.1)" : "rgba(0,0,0,0.05)",
                    color: p.status === "succeeded" ? "var(--bs-green, #1f4d3a)" : "var(--ink-3)",
                  }}>
                    {p.status}
                    {p.receiptUrl && (
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ opacity: 0.5 }}>
                        <path d="M1.5 7.5l6-6M7.5 7.5V1.5H1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer: count + load more */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "0 4px" }}>
        <span className="bs-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
          Showing {visible.length} of {succeeded.length} succeeded payments
        </span>
        {hasMore && (
          <button
            onClick={() => setShowing((s) => s + PAGE_SIZE)}
            style={{
              fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
              fontWeight: 500, letterSpacing: "0.06em",
              padding: "6px 14px", borderRadius: 7,
              border: "1px solid var(--rule)", background: "var(--paper)",
              color: "var(--ink-2)", cursor: "pointer",
              transition: "background 120ms",
            }}
            onMouseEnter={(e) => { (e.currentTarget).style.background = "var(--paper-2)"; }}
            onMouseLeave={(e) => { (e.currentTarget).style.background = "var(--paper)"; }}
          >
            Load {Math.min(PAGE_SIZE, remaining)} more
          </button>
        )}
      </div>
    </div>
  );
}
