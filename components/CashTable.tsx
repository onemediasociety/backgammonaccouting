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
      <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
        No cash buy-ins recorded yet. Use the form above to add one.
      </div>
    );
  }

  const total = list.reduce((s, e) => s + e.totalAmount, 0);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Event
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Players
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Buy-in
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Total
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {list.map((e) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-700">{e.date}</td>
              <td className="px-4 py-3 text-gray-700">
                <div>{e.event}</div>
                {e.notes && (
                  <div className="text-xs text-gray-400">{e.notes}</div>
                )}
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {e.playerCount}
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {formatAmount(e.buyInAmount, e.currency)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                {formatAmount(e.totalAmount, e.currency)}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 border-t border-gray-200">
          <tr>
            <td
              colSpan={4}
              className="px-4 py-3 text-right text-sm font-semibold text-gray-600"
            >
              Total Cash
            </td>
            <td className="px-4 py-3 text-right font-bold text-gray-900">
              {formatAmount(total, currency)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
