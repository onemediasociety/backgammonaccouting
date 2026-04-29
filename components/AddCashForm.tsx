"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  clubSlug: string;
  currency: string;
}

export default function AddCashForm({ clubSlug, currency }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    event: "",
    playerCount: "",
    buyInAmount: "",
    notes: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubSlug,
          currency,
          date: form.date,
          event: form.event,
          playerCount: Number(form.playerCount),
          buyInAmount: Number(form.buyInAmount) * 100,
          notes: form.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setForm({
        date: new Date().toISOString().slice(0, 10),
        event: "",
        playerCount: "",
        buyInAmount: "",
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
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
      >
        + Add Cash Buy-in
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
    >
      <h3 className="font-semibold text-gray-800">Record Cash Buy-in</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date">
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Event Name">
          <input
            type="text"
            required
            placeholder="Tuesday Night Tournament"
            value={form.event}
            onChange={(e) => update("event", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Number of Cash Players">
          <input
            type="number"
            required
            min={1}
            placeholder="8"
            value={form.playerCount}
            onChange={(e) => update("playerCount", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={`Buy-in Amount (${currency.toUpperCase()})`}>
          <input
            type="number"
            required
            min={0}
            step="0.01"
            placeholder="25.00"
            value={form.buyInAmount}
            onChange={(e) => update("buyInAmount", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Notes (optional)" wide>
          <input
            type="text"
            placeholder="Any notes about this session"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      {form.playerCount && form.buyInAmount && (
        <p className="text-sm text-gray-600">
          Total:{" "}
          <strong>
            {currency.toUpperCase()}{" "}
            {(Number(form.playerCount) * Number(form.buyInAmount)).toFixed(2)}
          </strong>
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Entry"}
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
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

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
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
