import { NextRequest, NextResponse } from "next/server";
import { CLUBS, formatAmount } from "@/lib/clubs";
import { buildClubSummaries } from "@/lib/stripe-client";
import { getCashTotalsPerClub } from "@/lib/cash-store";
import { getExpenseTotalsPerClub } from "@/lib/expenses-store";
import { parseDateRange } from "@/lib/date-range";

export const dynamic = "force-dynamic";

function toTs(dateStr: string | null, endOfDay = false): number | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}

function esc(val: string | null | undefined): string {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const range = parseDateRange({ get: (k) => sp.get(k) });
  const fromTs = toTs(range.from);
  const toTs_ = toTs(range.to, true);

  const [cashTotals, expenseTotals] = [
    getCashTotalsPerClub(range.from ?? undefined, range.to ?? undefined),
    getExpenseTotalsPerClub(range.from ?? undefined, range.to ?? undefined),
  ];

  let summaries: Awaited<ReturnType<typeof buildClubSummaries>> = [];
  try {
    summaries = await buildClubSummaries(fromTs, toTs_);
  } catch {
    summaries = [];
  }

  const periodLabel = range.from && range.to
    ? `${range.from} to ${range.to}` : "All Time";

  const rows: string[] = [];
  rows.push(`Backgammon Society — P&L Report — ${periodLabel}`);
  rows.push("");
  rows.push(["Club", "Currency", "Stripe Revenue", "Cash Revenue", "Total Revenue", "Expenses", "Net Income"].join(","));

  for (const club of CLUBS) {
    const stripeCents = summaries.find((s) => s.club.slug === club.slug)?.totalCents ?? 0;
    const cashCents = cashTotals[club.slug] ?? 0;
    const expenseCents = expenseTotals[club.slug] ?? 0;
    const totalCents = stripeCents + cashCents;
    const netCents = totalCents - expenseCents;
    rows.push([
      esc(club.name),
      club.currency.toUpperCase(),
      formatAmount(stripeCents, club.currency),
      formatAmount(cashCents, club.currency),
      formatAmount(totalCents, club.currency),
      formatAmount(expenseCents, club.currency),
      formatAmount(netCents, club.currency),
    ].join(","));
  }

  const periodStr = range.from ? `-${range.from}` : "";
  const filename = `backgammon-pnl${periodStr}.csv`;

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
