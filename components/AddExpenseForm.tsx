"use client";

import { useState, useRef } from "react";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expense-categories";

interface Props {
  clubSlug?: string;
  currency?: string;
  isSuperAdmin?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--rule)", background: "var(--paper)",
  color: "var(--ink)", fontSize: 13, fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={wide ? { gridColumn: "1 / -1" } : {}}>
      <label style={{ display: "block", fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

type ReceiptState =
  | { status: "none" }
  | { status: "uploading" }
  | { status: "error"; message: string }
  | { status: "mismatch"; extractedAmount: number; url: string }
  | { status: "ok"; extractedAmount: number | null; url: string };

export default function AddExpenseForm({ clubSlug: defaultSlug, currency = "usd", isSuperAdmin = false }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ReceiptState>({ status: "none" });
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "Venue" as ExpenseCategory,
    description: "",
    amount: "",
    notes: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Re-validate receipt amount if the amount field changed and we already have a receipt
    if (field === "amount" && receipt.status === "ok" || receipt.status === "mismatch") {
      revalidateReceipt(value, receipt as Extract<ReceiptState, { url: string }>);
    }
  }

  function revalidateReceipt(amountStr: string, r: Extract<ReceiptState, { url: string }>) {
    if (r.extractedAmount === null) return; // can't compare unknown
    const entered = parseFloat(amountStr);
    if (isNaN(entered)) return;
    const diff = Math.abs(entered - r.extractedAmount);
    if (diff > 0.02) {
      setReceipt({ status: "mismatch", extractedAmount: r.extractedAmount, url: r.url });
    } else {
      setReceipt({ status: "ok", extractedAmount: r.extractedAmount, url: r.url });
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceipt({ status: "uploading" });
    setError("");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/receipts", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setReceipt({ status: "error", message: data.error ?? "Upload failed" });
        return;
      }
      const data: { url: string; extractedAmount: number | null } = await res.json();
      const { url, extractedAmount } = data;

      if (extractedAmount === null) {
        // Claude couldn't read the amount — treat as verified (admin uploaded, but warn)
        setReceipt({ status: "ok", extractedAmount: null, url });
        return;
      }

      const entered = parseFloat(form.amount);
      if (!isNaN(entered) && form.amount !== "") {
        const diff = Math.abs(entered - extractedAmount);
        if (diff > 0.02) {
          setReceipt({ status: "mismatch", extractedAmount, url });
          return;
        }
      }
      setReceipt({ status: "ok", extractedAmount, url });
    } catch {
      setReceipt({ status: "error", message: "Network error uploading receipt." });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isSuperAdmin && receipt.status === "none") {
      setError("Please upload a receipt or invoice before saving.");
      return;
    }
    if (receipt.status === "uploading") {
      setError("Please wait — receipt is still uploading.");
      return;
    }
    if (receipt.status === "error") {
      setError("Receipt upload failed. Please try again.");
      return;
    }
    if (receipt.status === "mismatch") {
      setError(`Receipt total (${receipt.extractedAmount.toFixed(2)}) does not match the entered amount. Please correct the amount or upload the correct receipt.`);
      return;
    }

    const amountCents = Math.round(Number(form.amount) * 100);
    if (!amountCents || amountCents <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubSlug: defaultSlug,
          date: form.date,
          category: form.category,
          description: form.description,
          amountCents,
          currency,
          notes: form.notes,
          receiptUrl: receipt.status === "ok" ? receipt.url : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Error ${res.status}`);
        return;
      }
      window.location.reload();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
          padding: "8px 16px", borderRadius: 8,
          border: "1px solid rgba(139,26,26,0.3)",
          background: "rgba(139,26,26,0.07)", color: "var(--burgundy)",
          cursor: "pointer", fontWeight: 500, letterSpacing: "0.04em",
        }}
      >
        + Add Expense
      </button>
    );
  }

  const receiptOk = receipt.status === "ok";
  const amountEntered = form.amount !== "" && !isNaN(parseFloat(form.amount));

  return (
    <form onSubmit={handleSubmit} className="bs-card" style={{ padding: "20px", marginBottom: 16 }}>
      <h3 className="bs-heading" style={{ fontSize: 15, marginBottom: 16 }}>Record Expense</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <Field label="Date">
          <input type="date" required value={form.date} onChange={(e) => update("date", e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Category">
          <select value={form.category} onChange={(e) => update("category", e.target.value as ExpenseCategory)} style={{ ...inputStyle, cursor: "pointer" }}>
            {EXPENSE_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </Field>
        <Field label="Description" wide>
          <input type="text" required placeholder="Venue rental, tournament prizes…" value={form.description} onChange={(e) => update("description", e.target.value)} style={inputStyle} />
        </Field>
        <Field label={`Amount (${currency.toUpperCase()})`}>
          <input
            type="number" required min="0.01" step="0.01" placeholder="150.00"
            value={form.amount}
            onChange={(e) => {
              update("amount", e.target.value);
              if (receipt.status === "ok" || receipt.status === "mismatch") {
                const r = receipt as Extract<ReceiptState, { url: string }>;
                if (r.extractedAmount !== null) {
                  const entered = parseFloat(e.target.value);
                  if (!isNaN(entered)) {
                    const diff = Math.abs(entered - r.extractedAmount);
                    setReceipt(diff > 0.02
                      ? { status: "mismatch", extractedAmount: r.extractedAmount, url: r.url }
                      : { status: "ok", extractedAmount: r.extractedAmount, url: r.url }
                    );
                  }
                }
              }
            }}
            style={inputStyle}
          />
        </Field>
        <Field label="Notes (optional)">
          <input type="text" placeholder="Additional details" value={form.notes} onChange={(e) => update("notes", e.target.value)} style={inputStyle} />
        </Field>
      </div>

      {/* Receipt upload */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
          Receipt / Invoice {isSuperAdmin ? <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span> : <span style={{ color: "var(--burgundy)" }}>*</span>}
        </label>
        <div style={{
          border: `1px dashed ${receiptOk ? "var(--bs-green, #1f4d3a)" : receipt.status === "mismatch" ? "var(--burgundy)" : "var(--rule)"}`,
          borderRadius: 8, padding: "14px 16px",
          background: receiptOk ? "rgba(31,77,58,0.04)" : receipt.status === "mismatch" ? "rgba(139,26,26,0.04)" : "var(--paper-2)",
          transition: "border-color 200ms",
        }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            onChange={handleFileChange}
            style={{ fontSize: 12, color: "var(--ink-2)", width: "100%" }}
          />
          {receipt.status === "uploading" && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-dm-mono, monospace)" }}>
              Scanning receipt…
            </div>
          )}
          {receipt.status === "ok" && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--bs-green, #1f4d3a)", fontFamily: "var(--font-dm-mono, monospace)" }}>
              {receipt.extractedAmount !== null
                ? `✓ Receipt verified — total ${receipt.extractedAmount.toFixed(2)}`
                : "✓ Receipt uploaded (amount could not be auto-read — please verify manually)"}
            </div>
          )}
          {receipt.status === "mismatch" && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--burgundy)", fontFamily: "var(--font-dm-mono, monospace)" }}>
              ✗ Receipt shows {receipt.extractedAmount.toFixed(2)} — entered amount doesn&apos;t match
              {!amountEntered && ". Enter the amount above to verify."}
            </div>
          )}
          {receipt.status === "error" && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--burgundy)", fontFamily: "var(--font-dm-mono, monospace)" }}>
              ✗ {receipt.message}
            </div>
          )}
        </div>
        <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 5, fontFamily: "var(--font-dm-mono, monospace)" }}>
          JPG, PNG, WebP, GIF, or PDF · Receipt total must match amount entered
        </p>
      </div>

      {error && (
        <div style={{ background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "var(--burgundy)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="submit"
          disabled={saving || receipt.status === "uploading" || receipt.status === "mismatch" || (!isSuperAdmin && receipt.status === "none")}
          style={{
            fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
            padding: "8px 18px", borderRadius: 8, border: "none",
            background: receipt.status === "mismatch" ? "var(--rule)" : "var(--burgundy)",
            color: receipt.status === "mismatch" ? "var(--ink-3)" : "#fff",
            cursor: (saving || receipt.status === "uploading" || receipt.status === "mismatch" || (!isSuperAdmin && receipt.status === "none")) ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1, fontWeight: 500,
          }}
        >
          {saving ? "Saving…" : "Save Expense"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(""); setReceipt({ status: "none" }); if (fileRef.current) fileRef.current.value = ""; }} style={{
          fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
          padding: "8px 16px", borderRadius: 8,
          border: "1px solid var(--rule)", background: "var(--paper)",
          color: "var(--ink-2)", cursor: "pointer",
        }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
