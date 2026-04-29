"use client";

import { useState } from "react";
import { formatAmount } from "@/lib/clubs";
import type { Expense } from "@/lib/expenses-store";

interface Props {
  entries: Expense[];
  currency: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Equipment: "bg-blue-50 text-blue-700",
  Marketing: "bg-purple-50 text-purple-700",
  Venue: "bg-amber-50 text-amber-700",
  Prizes: "bg-green-50 text-green-700",
  Travel: "bg-indigo-50 text-indigo-700",
  Staff: "bg-pink-50 text-pink-700",
  Other: "bg-gray-100 text-gray-600",
};

export default function ExpenseTable({ entries, currency }: Props) {
  const [list, setList] = useState<Expense[]>(entries);

  async function handleDelete(id: string) {
    if (!confirm("Remove this expense?")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) setList((prev) => prev.filter((e) => e.id !== id));
  }

  if (list.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
        No expenses recorded yet. Use the form above to add one.
      </div>
    );
  }

  const total = list.reduce((s, e) => s + e.amountCents, 0);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {list.map((e) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-700">{e.date}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[e.category] ?? CATEGORY_COLORS.Other}`}>
                  {e.category}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-700">
                <div>{e.description}</div>
                {e.notes && <div className="text-xs text-gray-400">{e.notes}</div>}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-red-600">
                {formatAmount(e.amountCents, e.currency)}
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
            <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-gray-600">
              Total Expenses
            </td>
            <td className="px-4 py-3 text-right font-bold text-red-600">
              {formatAmount(total, currency)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
