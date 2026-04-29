"use client";

import { formatAmount } from "@/lib/clubs";
import type { PaymentRecord } from "@/lib/stripe-client";

const STATUS_STYLE: Record<string, string> = {
  succeeded: "bg-green-100 text-green-700",
  canceled: "bg-gray-100 text-gray-500",
  requires_payment_method: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
};

interface Props {
  payments: PaymentRecord[];
  currency: string;
}

export default function TransactionTable({ payments, currency }: Props) {
  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
        No Stripe payments found for this club.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
              Payment ID
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-700">
                {new Date(p.created * 1000).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">
                {formatAmount(p.amount, p.currency)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    STATUS_STYLE[p.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {p.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden sm:table-cell">
                {p.id}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
