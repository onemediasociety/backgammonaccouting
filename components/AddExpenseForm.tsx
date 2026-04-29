"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expense-categories";
import { CLUBS } from "@/lib/clubs";

interface Props {
  clubSlug?: string;
  currency?: string;
}

export default function AddExpenseForm({ clubSlug: defaultSlug, currency: defaultCurrency }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clubSlug: defaultSlug ?? "nyc",
    date: new Date().toISOString().slice(0, 10),
    category: "Venue" as ExpenseCategory,
    description: "",
    amount: "",
    notes: "",
  });

  const selectedClub = CLUBS.find((c) => c.slug === form.clubSlug);
  const currency = defaultCurrency ?? selectedClub?.currency ?? "usd";

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubSlug: form.clubSlug,
          date: form.date,
          category: form.category,
          description: form.description,
          amountCents: Math.round(Number(form.amount) * 100),
          currency,
          notes: form.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setForm({
        clubSlug: defaultSlug ?? "nyc",
        date: new Date().toISOString().slice(0, 10),
        category: "Venue",
        description: "",
        amount: "",
        notes: "",
      });
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
      >
        + Add Expense
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
    >
      <h3 className="font-semibold text-gray-800">Record Expense</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {!defaultSlug && (
          <Field label="Club">
            <select
              value={form.clubSlug}
              onChange={(e) => update("clubSlug", e.target.value)}
              className={inputCls}
            >
              {CLUBS.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Date">
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Category">
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value as ExpenseCategory)}
            className={inputCls}
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </Field>
        <Field label="Description" wide>
          <input
            type="text"
            required
            placeholder="Venue rental for tournament"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={`Amount (${currency.toUpperCase()})`}>
          <input
            type="number"
            required
            min={0}
            step="0.01"
            placeholder="150.00"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Notes (optional)">
          <input
            type="text"
            placeholder="Additional details"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Expense"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
