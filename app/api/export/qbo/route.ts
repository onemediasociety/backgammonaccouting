import { NextRequest, NextResponse } from "next/server";
import { fetchAllPayments, type PaymentRecord } from "@/lib/stripe-client";
import { getAllCashEntries } from "@/lib/cash-store";
import { getAllExpenses } from "@/lib/expenses-store";
import { getClub } from "@/lib/clubs";
import { parseDateRange } from "@/lib/date-range";

export const dynamic = "force-dynamic";

function toTs(dateStr: string | null, endOfDay = false): number | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}

function esc(val: string | null | undefined): string {
  if (!val) return "";
  return val.includes(",") ? `"${val.replace(/"/g, '""')}"` : val;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const range = parseDateRange({ get: (k) => sp.get(k) });
  const clubFilter = sp.get("club");
  const format = sp.get("format") ?? "quickbooks"; // quickbooks | xero

  const fromTs = toTs(range.from);
  const toTs_ = toTs(range.to, true);

  let stripePayments: PaymentRecord[] = [];
  try {
    stripePayments = await fetchAllPayments(500, fromTs, toTs_);
  } catch {
    stripePayments = [];
  }

  const cashEntries = getAllCashEntries(range.from ?? undefined, range.to ?? undefined);
  const expenses = getAllExpenses(range.from ?? undefined, range.to ?? undefined);

  const rows: string[] = [];

  if (format === "xero") {
    // Xero CSV format
    rows.push(["*ContactName", "*InvoiceNumber", "*InvoiceDate", "*DueDate", "*Description", "*Quantity", "*UnitAmount", "*AccountCode", "*TaxType", "Currency"].join(","));

    let invoiceNum = 1;

    for (const p of stripePayments ?? []) {
      if (p.status !== "succeeded") continue;
      if (clubFilter && p.clubSlug !== clubFilter) continue;
      const club = getClub(p.clubSlug);
      const date = new Date(p.created * 1000).toISOString().slice(0, 10);
      const amount = (p.amount / 100).toFixed(2);
      rows.push([
        esc("Backgammon Member"),
        `INV-${String(invoiceNum++).padStart(4, "0")}`,
        date,
        date,
        esc(`${club?.name ?? p.clubSlug} Online Buy-in`),
        "1",
        amount,
        "200",
        "NONE",
        p.currency.toUpperCase(),
      ].join(","));
    }

    for (const e of cashEntries) {
      if (clubFilter && e.clubSlug !== clubFilter) continue;
      const club = getClub(e.clubSlug);
      const amount = (e.totalAmount / 100).toFixed(2);
      rows.push([
        esc("Cash Members"),
        `INV-${String(invoiceNum++).padStart(4, "0")}`,
        e.date,
        e.date,
        esc(`${club?.name ?? e.clubSlug} – ${e.event}`),
        String(e.playerCount),
        (e.buyInAmount / 100).toFixed(2),
        "200",
        "NONE",
        e.currency.toUpperCase(),
      ].join(","));
    }

    for (const ex of expenses) {
      if (clubFilter && ex.clubSlug !== clubFilter) continue;
      const club = getClub(ex.clubSlug);
      const amount = (ex.amountCents / 100).toFixed(2);
      rows.push([
        esc(club?.name ?? ex.clubSlug),
        `BILL-${String(invoiceNum++).padStart(4, "0")}`,
        ex.date,
        ex.date,
        esc(`${ex.category}: ${ex.description}`),
        "1",
        amount,
        "400",
        "NONE",
        ex.currency.toUpperCase(),
      ].join(","));
    }
  } else {
    // QuickBooks IIF-style CSV (works with QB import wizard)
    rows.push(["Date", "Transaction Type", "Account", "Class", "Amount", "Memo", "Name", "Currency", "Ref #"].join(","));

    for (const p of stripePayments ?? []) {
      if (p.status !== "succeeded") continue;
      if (clubFilter && p.clubSlug !== clubFilter) continue;
      const club = getClub(p.clubSlug);
      const date = new Date(p.created * 1000).toLocaleDateString("en-US");
      const amount = (p.amount / 100).toFixed(2);
      rows.push([
        date,
        "Payment",
        "Stripe",
        esc(club?.name ?? p.clubSlug),
        amount,
        esc(`Online buy-in – ${club?.name ?? p.clubSlug}`),
        esc("Backgammon Member"),
        p.currency.toUpperCase(),
        p.id,
      ].join(","));
    }

    for (const e of cashEntries) {
      if (clubFilter && e.clubSlug !== clubFilter) continue;
      const club = getClub(e.clubSlug);
      const amount = (e.totalAmount / 100).toFixed(2);
      rows.push([
        e.date,
        "Payment",
        "Cash",
        esc(club?.name ?? e.clubSlug),
        amount,
        esc(`${e.event} – ${e.playerCount} players`),
        esc("Cash Members"),
        e.currency.toUpperCase(),
        e.id,
      ].join(","));
    }

    for (const ex of expenses) {
      if (clubFilter && ex.clubSlug !== clubFilter) continue;
      const club = getClub(ex.clubSlug);
      const amount = `-${(ex.amountCents / 100).toFixed(2)}`;
      rows.push([
        ex.date,
        "Expense",
        esc(ex.category),
        esc(club?.name ?? ex.clubSlug),
        amount,
        esc(ex.description),
        esc(club?.name ?? ex.clubSlug),
        ex.currency.toUpperCase(),
        ex.id,
      ].join(","));
    }
  }

  const csv = rows.join("\n");
  const filename = `backgammon-${format}-export${range.from ? `-${range.from}` : ""}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
