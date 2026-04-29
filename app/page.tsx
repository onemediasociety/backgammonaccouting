import { Suspense } from "react";
import { buildClubSummaries, fetchBalance, fetchAllPayments, fetchFeesByClub } from "@/lib/stripe-client";
import { getCashTotalsPerClub, getAllCashEntries } from "@/lib/cash-store";
import { formatAmount, CLUBS } from "@/lib/clubs";
import ClubCard from "@/components/ClubCard";
import DateFilter from "@/components/DateFilter";
import RevenueChart from "@/components/RevenueChart";
import { parseDateRange } from "@/lib/date-range";
import { buildMonthlyRevenue } from "@/lib/monthly-revenue";

export const dynamic = "force-dynamic";

function toTs(dateStr: string | null, endOfDay = false): number | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}

function BalancePill({ label, amount, currency }: { label: string; amount: number; currency: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{formatAmount(amount, currency)}</p>
    </div>
  );
}

export default async function DashboardPage({
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

  // For chart: always fetch last 6 months regardless of filter
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const chartFromTs = Math.floor(sixMonthsAgo.getTime() / 1000);

  let summaries = null;
  let balance = null;
  let cashTotals: Record<string, number> = {};
  let feesByClub: Record<string, number> = {};
  let allPaymentsForChart = null;
  let cashEntriesForChart = null;
  let error: string | null = null;

  try {
    [summaries, balance, cashTotals, feesByClub, allPaymentsForChart] = await Promise.all([
      buildClubSummaries(fromTs, toTs_),
      fetchBalance(),
      Promise.resolve(getCashTotalsPerClub(range.from ?? undefined, range.to ?? undefined)),
      fetchFeesByClub(fromTs, toTs_),
      fetchAllPayments(500, chartFromTs),
    ]);
    cashEntriesForChart = getAllCashEntries(
      sixMonthsAgo.toISOString().slice(0, 10),
      undefined
    );
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  const grandTotalUSD = summaries
    ?.filter((s) => s.club.currency === "usd")
    .reduce((sum, s) => sum + s.totalCents, 0) ?? 0;

  const totalTransactions = summaries?.reduce((sum, s) => sum + s.successCount, 0) ?? 0;

  const periodLabel = range.from && range.to
    ? `${range.from} – ${range.to}`
    : range.period === "all" || !range.period
    ? "All Time"
    : "";

  const monthlyBars = allPaymentsForChart && cashEntriesForChart
    ? buildMonthlyRevenue(allPaymentsForChart, cashEntriesForChart, 6)
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">🎲 The Backgammon Society</h1>
        <p className="mt-1 text-gray-500">Accounting Dashboard — All Clubs</p>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-semibold text-gray-600">Period:</span>
          {periodLabel && (
            <span className="text-sm text-gray-400">{periodLabel}</span>
          )}
        </div>
        <Suspense fallback={null}>
          <DateFilter />
        </Suspense>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 mb-8">
          <h2 className="text-red-800 font-semibold mb-1">Stripe Connection Error</h2>
          <p className="text-red-700 text-sm">{error}</p>
          <p className="text-red-600 text-sm mt-2">
            Make sure <code className="bg-red-100 px-1 rounded">STRIPE_SECRET_KEY</code> is set in{" "}
            <code className="bg-red-100 px-1 rounded">.env.local</code> (or Vercel env vars).
          </p>
        </div>
      ) : null}

      {/* Stripe balance */}
      {balance && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Stripe Account Balance (live — not period-filtered)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 divide-x divide-gray-100">
            {balance.available.map((b) => (
              <BalancePill key={b.currency + "av"} label={`Available (${b.currency.toUpperCase()})`} amount={b.amount} currency={b.currency} />
            ))}
            {balance.pending.map((b) =>
              b.amount > 0 ? (
                <BalancePill key={b.currency + "pe"} label={`Pending (${b.currency.toUpperCase()})`} amount={b.amount} currency={b.currency} />
              ) : null
            )}
          </div>
        </div>
      )}

      {/* KPI strip */}
      {summaries && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total USD Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatAmount(grandTotalUSD, "usd")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Stripe Transactions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalTransactions}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Active Clubs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{CLUBS.length}</p>
          </div>
        </div>
      )}

      {/* Revenue chart (last 6 months, always) */}
      {monthlyBars.length > 0 && (
        <RevenueChart months={monthlyBars} currency="usd" />
      )}

      <h2 className="text-lg font-semibold text-gray-700 mb-4">Clubs</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CLUBS.map((club) => {
          const summary = summaries?.find((s) => s.club.slug === club.slug);
          const cashTotal = cashTotals[club.slug] ?? 0;
          const stripeFees = feesByClub[club.slug] ?? 0;
          return (
            <ClubCard
              key={club.slug}
              club={club}
              stripeTotal={summary?.totalCents ?? 0}
              stripeCount={summary?.successCount ?? 0}
              stripeFees={stripeFees}
              cashTotal={cashTotal}
              hasError={!!error}
              periodQuery={
                range.period !== "all"
                  ? new URLSearchParams(sp as Record<string, string>).toString()
                  : ""
              }
            />
          );
        })}
      </div>
    </div>
  );
}
