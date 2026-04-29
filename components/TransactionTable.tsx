"use client";

import { formatAmount } from "@/lib/clubs";
import type { PaymentRecord } from "@/lib/stripe-client";

interface Props {
  payments: PaymentRecord[];
  currency: string;
}

export default function TransactionTable({ payments, currency }: Props) {
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

  return (
    <div className="bs-card" style={{ overflow: "hidden" }}>
      <table className="bs-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th style={{ textAlign: "right" }}>Amount</th>
            <th>Status</th>
            <th style={{ fontSize: 9 }}>ID</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td className="bs-mono" style={{ fontSize: 12 }}>
                {new Date(p.created * 1000).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                })}
              </td>
              <td style={{ fontSize: 13, color: "var(--ink-2)" }}>
                {p.description ?? "Online buy-in"}
              </td>
              <td className="bs-amount" style={{ textAlign: "right", fontSize: 13 }}>
                {formatAmount(p.amount, p.currency)}
              </td>
              <td>
                <span style={{
                  display: "inline-block",
                  padding: "2px 8px", borderRadius: 20,
                  fontFamily: "var(--font-dm-mono, monospace)", fontSize: 10, letterSpacing: "0.04em",
                  background: p.status === "succeeded" ? "rgba(31,77,58,0.1)" : "rgba(0,0,0,0.05)",
                  color: p.status === "succeeded" ? "var(--bs-green, #1f4d3a)" : "var(--ink-3)",
                }}>
                  {p.status}
                </span>
              </td>
              <td className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                {p.id}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
