import { Suspense } from "react";
import Link from "next/link";
import { CLUBS, formatAmount } from "@/lib/clubs";
import { buildClubSummaries } from "@/lib/stripe-client";
import { getCashTotalsPerClub } from "@/lib/cash-store";
import { getExpenseTotalsPerClub } from "@/lib/expenses-store";
import DateFilter from "@/components/DateFilter";
import ExportButtons from "@/components/ExportButtons";
import { parseDateRange } from "@/lib/date-range";

export const dynamic = "force-dynamic";

function toTs(dateStr: string | null, endOfDay = false): number | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const range = parseDateRange({
    get: (k: string) => (sp as Record<string, string>)[k] ?? null,
  });

  const fromTs = toTs(range.from);
  const toTs_ = toTs(range.to, true);

  let summaries = null;
  let error: string | null = null;

  try {
    summaries = await buildClubSummaries(fromTs, toTs_);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Stripe error";
  }

  const cashTotals = getCashTotalsPerClub(range.from ?? undefined, range.to ?? undefined);
  const expenseTotals = getExpenseTotalsPerClub(range.from ?? undefined, range.to ?? undefined);

  const periodLabel =
    range.from && range.to
      ? `${range.from} – ${range.to}`
      : "All Time";

  const rows = CLUBS.map((club) => {
    const stripeCents = summaries?.find((s) => s.club.slug === club.slug)?.totalCents ?? 0;
    const cashCents = cashTotals[club.slug] ?? 0;
    const expenseCents = expenseTotals[club.slug] ?? 0;
    const revenueCents = stripeCents + cashCents;
    const netCents = revenueCents - expenseCents;
    return { club, stripeCents, cashCents, revenueCents, expenseCents, netCents };
  });

  const grandRevenue = rows.filter((r) => r.club.currency === "usd").reduce((s, r) => s + r.revenueCents, 0);
  const grandExpenses = rows.filter((r) => r.club.currency === "usd").reduce((s, r) => s + r.expenseCents, 0);
  const grandNet = grandRevenue - grandExpenses;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">Dashboard</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">P&amp;L Report</span>
      </div>

      <div className="mb-6" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Report</h1>
          <p className="text-gray-500 mt-1">Revenue vs. expenses per club — {periodLabel}</p>
        </div>
        <ExportButtons from={range.from} to={range.to} period={range.period} mode="pnl" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-semibold text-gray-600">Period:</span>
          <span className="text-sm text-gray-400">{periodLabel}</span>
        </div>
        <Suspense fallback={null}>
          <DateFilter />
        </Suspense>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm mb-6">
          Stripe error: {error}. Cash and expense data still shown.
        </div>
      )}

      {/* USD Summary KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <KpiBox label="Total USD Revenue" value={formatAmount(grandRevenue, "usd")} />
        <KpiBox label="Total USD Expenses" value={formatAmount(grandExpenses, "usd")} color="red" />
        <KpiBox label="Net Income (USD)" value={formatAmount(grandNet, "usd")} color={grandNet >= 0 ? "green" : "red"} highlight />
      </div>

      {/* P&L Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Club</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Stripe</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Cash</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Expenses</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(({ club, stripeCents, cashCents, revenueCents, expenseCents, netCents }) => (
              <tr key={club.slug} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <Link href={`/clubs/${club.slug}`} className="flex items-center gap-2 hover:text-blue-600">
                    <span>{club.flag}</span>
                    <span className="font-medium text-gray-800">{club.name}</span>
                    <span className="text-xs text-gray-400">{club.currency.toUpperCase()}</span>
                  </Link>
                </td>
                <td className="px-5 py-3 text-right text-gray-700">{formatAmount(stripeCents, club.currency)}</td>
                <td className="px-5 py-3 text-right text-gray-700">{formatAmount(cashCents, club.currency)}</td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatAmount(revenueCents, club.currency)}</td>
                <td className="px-5 py-3 text-right text-red-600">{expenseCents > 0 ? `(${formatAmount(expenseCents, club.currency)})` : "—"}</td>
                <td className={`px-5 py-3 text-right font-bold ${netCents >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatAmount(netCents, club.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expense breakdown by category */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Expenses by Club</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.filter((r) => r.expenseCents > 0).map(({ club, expenseCents, revenueCents }) => {
            const pct = revenueCents > 0 ? Math.round((expenseCents / revenueCents) * 100) : 0;
            return (
              <div key={club.slug} className={`rounded-xl border border-gray-200 p-4 ${club.accentBg}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{club.flag}</span>
                  <span className="font-semibold text-gray-800">{club.city}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Expenses</span>
                    <span className="font-semibold text-red-600">{formatAmount(expenseCents, club.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">% of Revenue</span>
                    <span className="font-semibold text-gray-700">{pct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-red-400 rounded-full"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {rows.every((r) => r.expenseCents === 0) && (
            <div className="col-span-3 rounded-lg border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
              No expenses recorded yet. Go to a club page to add expenses.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiBox({
  label,
  value,
  color = "default",
  highlight = false,
}: {
  label: string;
  value: string;
  color?: "default" | "red" | "green";
  highlight?: boolean;
}) {
  const bg = highlight
    ? color === "green"
      ? "bg-green-600 border-green-700 text-white"
      : color === "red"
      ? "bg-red-600 border-red-700 text-white"
      : "bg-blue-600 border-blue-700 text-white"
    : "bg-white border-gray-200";
  const labelCls = highlight ? "text-white/70" : "text-gray-400";
  const valueCls = highlight
    ? "text-white"
    : color === "red"
    ? "text-red-600"
    : color === "green"
    ? "text-green-600"
    : "text-gray-900";

  return (
    <div className={`rounded-xl border p-5 ${bg}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${labelCls}`}>{label}</p>
      <p className={`text-2xl font-bold ${valueCls}`}>{value}</p>
    </div>
  );
}
