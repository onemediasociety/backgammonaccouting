import { Suspense } from "react";
import { fetchBalance, fetchAllPayments, fetchFeesByClub } from "@/lib/stripe-client";
import { getCashTotalsPerClub, getAllCashEntries } from "@/lib/cash-store";
import { getExpenseTotalsPerClub } from "@/lib/expenses-store";
import { formatAmount } from "@/lib/clubs";
import { getAllClubs } from "@/lib/clubs-server";
import Link from "next/link";
import DateFilter from "@/components/DateFilter";
import RevenueChart from "@/components/RevenueChart";
import ExportButtons from "@/components/ExportButtons";
import { parseDateRange } from "@/lib/date-range";
import { buildMonthlyRevenue } from "@/lib/monthly-revenue";
import type { ClubSummary } from "@/lib/stripe-client";


export const dynamic = "force-dynamic";

function toTs(dateStr: string | null, endOfDay = false): number | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}

function KpiCard({ label, value, sub, highlight = false }: {
  label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className="bs-card" style={{
      padding: "18px 20px",
      background: highlight ? "var(--ink)" : undefined,
      border: highlight ? "none" : undefined,
    }}>
      <p className="bs-label" style={{ marginBottom: 6, color: highlight ? "rgba(240,235,226,0.45)" : undefined }}>
        {label}
      </p>
      <p className="bs-mono" style={{ fontSize: 20, fontWeight: 700, color: highlight ? "var(--brass)" : "var(--ink)" }}>
        {value}
      </p>
      {sub && <p className="bs-mono" style={{ fontSize: 10, color: highlight ? "rgba(240,235,226,0.35)" : "var(--ink-3)", marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bs-skeleton" style={{ height: 80, borderRadius: 12 }} />
        ))}
      </div>
      <div className="bs-skeleton" style={{ height: 220, borderRadius: 12, marginBottom: 28 }} />
      <div className="bs-skeleton" style={{ height: 300, borderRadius: 12 }} />
    </>
  );
}

async function OverviewData({
  effectiveFromTs, fromTs, toTs_, range,
}: {
  effectiveFromTs: number | undefined;
  fromTs: number | undefined;
  toTs_: number | undefined;
  range: { from: string | null; to: string | null; period?: string };
}) {
  const CLUBS = getAllClubs();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const chartFromTs = Math.floor(sixMonthsAgo.getTime() / 1000);

  let summaries: ClubSummary[] | null = null;
  let balance = null;
  let cashTotals: Record<string, number> = {};
  let expenseTotals: Record<string, number> = {};
  let feesByClub: Record<string, number> = {};
  let feesAvailable = false;
  let allPaymentsForChart = null;
  let cashEntriesForChart = null;
  let error: string | null = null;

  try {
    const [allPayments, bal, fees, ct, et] = await Promise.all([
      fetchAllPayments(effectiveFromTs, toTs_),
      fetchBalance(),
      fetchFeesByClub(fromTs, toTs_).then((f) => { feesAvailable = true; return f; }).catch(() => ({})),
      getCashTotalsPerClub(range.from ?? undefined, range.to ?? undefined),
      getExpenseTotalsPerClub(range.from ?? undefined, range.to ?? undefined),
    ]);

    balance = bal;
    cashTotals = ct;
    expenseTotals = et;
    feesByClub = fees;
    allPaymentsForChart = allPayments.filter((p) => p.created >= chartFromTs);

    const periodPayments = fromTs
      ? allPayments.filter((p) => p.created >= fromTs && (!toTs_ || p.created <= toTs_))
      : allPaymentsForChart;

    summaries = CLUBS.map((club) => {
      const clubPayments = periodPayments.filter(
        (p) => p.clubSlug === club.slug && p.status === "succeeded"
      );
      return {
        club,
        payments: clubPayments,
        totalCents: clubPayments.reduce((s, p) => s + p.amount, 0),
        successCount: clubPayments.length,
      };
    });

    cashEntriesForChart = await getAllCashEntries(sixMonthsAgo.toISOString().slice(0, 10), undefined);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  const totalStripeUSD = summaries?.filter(s => s.club.currency === "usd").reduce((s, c) => s + c.totalCents, 0) ?? 0;
  const totalCashUSD = Object.entries(cashTotals).reduce((s, [slug, v]) => {
    const club = CLUBS.find(c => c.slug === slug);
    return club?.currency === "usd" ? s + v : s;
  }, 0);
  const totalExpensesUSD = Object.entries(expenseTotals).reduce((s, [slug, v]) => {
    const club = CLUBS.find(c => c.slug === slug);
    return club?.currency === "usd" ? s + v : s;
  }, 0);
  const totalFeesUSD = Object.entries(feesByClub).reduce((s, [slug, v]) => {
    const club = CLUBS.find(c => c.slug === slug);
    return club?.currency === "usd" ? s + v : s;
  }, 0);
  const grossProfitUSD = totalStripeUSD + totalCashUSD;
  const netIncomeUSD = grossProfitUSD - totalFeesUSD;
  const totalTransactions = summaries?.reduce((s, c) => s + c.successCount, 0) ?? 0;

  const monthlyBars = allPaymentsForChart && cashEntriesForChart
    ? buildMonthlyRevenue(allPaymentsForChart, cashEntriesForChart, 6)
    : [];

  const rankedClubs = CLUBS.map((club) => {
    const summary = summaries?.find(s => s.club.slug === club.slug);
    const stripe = summary?.totalCents ?? 0;
    const cash = cashTotals[club.slug] ?? 0;
    const fees = feesByClub[club.slug] ?? 0;
    const expenses = expenseTotals[club.slug] ?? 0;
    const gross = stripe + cash;
    const net = gross - fees;
    return { club, stripeTotal: stripe, stripeCount: summary?.successCount ?? 0, cash, fees, expenses, gross, net };
  }).sort((a, b) => b.net - a.net);

  return (
    <>
      {balance && (
        <div style={{ display: "flex", gap: 20, alignItems: "center", justifyContent: "flex-end", marginBottom: 16 }}>
          {balance.available.map((b) => (
            <div key={b.currency} style={{ textAlign: "right" }}>
              <p className="bs-label" style={{ marginBottom: 2 }}>Balance · {b.currency.toUpperCase()}</p>
              <p className="bs-amount" style={{ fontSize: 15, fontWeight: 600 }}>{formatAmount(b.amount, b.currency)}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{
          background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)",
          borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "var(--burgundy)",
        }}>
          Stripe error: {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Net Profit (USD)" value={formatAmount(netIncomeUSD, "usd")} highlight />
        <KpiCard label="Gross Profit (USD)" value={formatAmount(grossProfitUSD, "usd")} sub="Stripe + Cash" />
        <KpiCard label="Stripe Revenue" value={formatAmount(totalStripeUSD, "usd")} sub={`${totalTransactions} transactions`} />
        <KpiCard label="Cash Buy-ins" value={formatAmount(totalCashUSD, "usd")} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <KpiCard label="Stripe Fees" value={feesAvailable ? `(${formatAmount(totalFeesUSD, "usd")})` : "—"} sub={feesAvailable ? "deducted from net" : "unavailable"} />
        <KpiCard label="Tracked Expenses" value={formatAmount(totalExpensesUSD, "usd")} sub="not included in net" />
        <KpiCard label="Active Clubs" value={CLUBS.length.toString()} />
        <KpiCard label="Transactions" value={totalTransactions.toString()} />
      </div>

      {monthlyBars.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <RevenueChart months={monthlyBars} currency="usd" />
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <h2 className="bs-heading" style={{ fontSize: 18 }}>Club Ranking</h2>
      </div>
      <div className="bs-card" style={{ overflow: "hidden", marginBottom: 40 }}>
        <table className="bs-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>Club</th>
              <th style={{ textAlign: "right" }}>Stripe</th>
              <th style={{ textAlign: "right" }}>Cash</th>
              <th style={{ textAlign: "right" }}>Gross Profit</th>
              {feesAvailable && <th style={{ textAlign: "right" }}>Stripe Fees</th>}
              <th style={{ textAlign: "right" }}>Net Profit</th>
              <th style={{ textAlign: "right" }}>Txns</th>
            </tr>
          </thead>
          <tbody>
            {rankedClubs.map(({ club, stripeTotal, stripeCount, cash, fees, gross, net }, i) => (
              <tr key={club.slug}>
                <td className="bs-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{i + 1}</td>
                <td>
                  <Link href={`/clubs/${club.slug}`} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}>
                    <span style={{ fontSize: 16 }}>{club.flag}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{club.city}</div>
                      <div className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{club.currency.toUpperCase()}</div>
                    </div>
                  </Link>
                </td>
                <td className="bs-amount" style={{ textAlign: "right", fontSize: 12 }}>{formatAmount(stripeTotal, club.currency)}</td>
                <td className="bs-amount" style={{ textAlign: "right", fontSize: 12 }}>{formatAmount(cash, club.currency)}</td>
                <td className="bs-amount" style={{ textAlign: "right", fontSize: 12, fontWeight: 600 }}>{formatAmount(gross, club.currency)}</td>
                {feesAvailable && <td className="bs-amount bs-amount-negative" style={{ textAlign: "right", fontSize: 12 }}>({formatAmount(fees, club.currency)})</td>}
                <td className="bs-amount" style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: net >= 0 ? "var(--green, #1f4d3a)" : "var(--burgundy)" }}>
                  {formatAmount(net, club.currency)}
                </td>
                <td className="bs-mono" style={{ textAlign: "right", fontSize: 11, color: "var(--ink-3)" }}>{stripeCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
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

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const chartFromTs = Math.floor(sixMonthsAgo.getTime() / 1000);
  const effectiveFromTs = fromTs && chartFromTs ? Math.min(fromTs, chartFromTs) : (fromTs ?? chartFromTs);

  const periodLabel = range.from && range.to
    ? `${range.from} – ${range.to}`
    : range.period === "all" || !range.period ? "All Time" : range.period.toUpperCase();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="bs-heading" style={{ fontSize: 28, marginBottom: 3 }}>Overview</h1>
          <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            All clubs · {periodLabel}
          </p>
        </div>
        <ExportButtons from={range.from} to={range.to} period={range.period} mode="overview" />
      </div>

      <div className="bs-card" style={{ padding: "14px 18px", marginBottom: 24 }}>
        <Suspense fallback={null}>
          <DateFilter />
        </Suspense>
      </div>

      <Suspense fallback={<KpiSkeleton />}>
        <OverviewData
          effectiveFromTs={effectiveFromTs}
          fromTs={fromTs}
          toTs_={toTs_}
          range={range}
        />
      </Suspense>
    </div>
  );
}
