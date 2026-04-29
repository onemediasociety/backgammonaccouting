import { Suspense } from "react";
import { fetchBalance, fetchAllPayments, fetchFeesByClub } from "@/lib/stripe-client";
import { getCashTotalsPerClub, getAllCashEntries } from "@/lib/cash-store";
import { formatAmount, CLUBS } from "@/lib/clubs";
import ClubCard from "@/components/ClubCard";
import DateFilter from "@/components/DateFilter";
import RevenueChart from "@/components/RevenueChart";
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

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bs-card" style={{ padding: "20px 24px" }}>
      <p className="bs-label" style={{ marginBottom: 6 }}>{label}</p>
      <p className="bs-mono" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)" }}>{value}</p>
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

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const chartFromTs = Math.floor(sixMonthsAgo.getTime() / 1000);

  let summaries: ClubSummary[] | null = null;
  let balance = null;
  let cashTotals: Record<string, number> = {};
  let feesByClub: Record<string, number> = {};
  let feesAvailable = false;
  let allPaymentsForChart = null;
  let cashEntriesForChart = null;
  let error: string | null = null;

  // Use the wider date range (chart = last 6 months) so we only hit Stripe once.
  // Filter down to the selected period for summaries in JS — no extra API call.
  const effectiveFromTs = fromTs && chartFromTs ? Math.min(fromTs, chartFromTs) : (fromTs ?? chartFromTs);

  try {
    const [allPayments, bal, ct] = await Promise.all([
      fetchAllPayments(effectiveFromTs, toTs_),
      fetchBalance(),
      Promise.resolve(getCashTotalsPerClub(range.from ?? undefined, range.to ?? undefined)),
    ]);

    balance = bal;
    cashTotals = ct;

    // Derive chart data (last 6 months)
    allPaymentsForChart = allPayments.filter((p) => p.created >= chartFromTs);

    // Derive summaries for the selected period
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

    cashEntriesForChart = getAllCashEntries(
      sixMonthsAgo.toISOString().slice(0, 10),
      undefined
    );
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  // Fees fetch is separate and best-effort — cap at 300 records to stay fast
  try {
    feesByClub = await fetchFeesByClub(fromTs, toTs_, 300);
    feesAvailable = true;
  } catch {
    feesAvailable = false;
  }

  const grandTotalUSD = summaries
    ?.filter((s) => s.club.currency === "usd")
    .reduce((sum, s) => sum + s.totalCents, 0) ?? 0;
  const totalTransactions = summaries?.reduce((sum, s) => sum + s.successCount, 0) ?? 0;

  const periodLabel = range.from && range.to
    ? `${range.from} – ${range.to}`
    : range.period === "all" || !range.period ? "All Time" : "";

  const monthlyBars = allPaymentsForChart && cashEntriesForChart
    ? buildMonthlyRevenue(allPaymentsForChart, cashEntriesForChart, 6)
    : [];

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="bs-heading" style={{ fontSize: 32, marginBottom: 4 }}>
          The Backgammon Society
        </h1>
        <p className="bs-mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Accounting Dashboard · All Clubs
        </p>
      </div>

      {/* Date filter */}
      <div className="bs-card" style={{ padding: "16px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span className="bs-label">Period</span>
          {periodLabel && (
            <span className="bs-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{periodLabel}</span>
          )}
        </div>
        <Suspense fallback={null}>
          <DateFilter />
        </Suspense>
      </div>

      {error && (
        <div style={{
          background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)",
          borderRadius: 10, padding: "16px 20px", marginBottom: 24,
        }}>
          <p style={{ fontWeight: 600, color: "var(--burgundy)", marginBottom: 4 }}>Stripe Connection Error</p>
          <p style={{ fontSize: 13, color: "var(--ink-2)" }}>{error}</p>
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>
            Ensure <code style={{ background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 3 }}>STRIPE_SECRET_KEY</code> is set.
          </p>
        </div>
      )}

      {/* Stripe balance */}
      {balance && (
        <div className="bs-card" style={{ padding: "18px 24px", marginBottom: 24 }}>
          <p className="bs-label" style={{ marginBottom: 14 }}>Stripe Account Balance · Live</p>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            {balance.available.map((b) => (
              <div key={b.currency + "av"}>
                <p className="bs-label" style={{ marginBottom: 4, color: "var(--bs-green, #1f4d3a)" }}>
                  Available · {b.currency.toUpperCase()}
                </p>
                <p className="bs-amount" style={{ fontSize: 18 }}>{formatAmount(b.amount, b.currency)}</p>
              </div>
            ))}
            {balance.pending.map((b) =>
              b.amount > 0 ? (
                <div key={b.currency + "pe"}>
                  <p className="bs-label" style={{ marginBottom: 4 }}>Pending · {b.currency.toUpperCase()}</p>
                  <p className="bs-amount bs-amount-dim" style={{ fontSize: 18 }}>{formatAmount(b.amount, b.currency)}</p>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* KPI strip */}
      {summaries && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          <KpiTile label="Total USD Revenue" value={formatAmount(grandTotalUSD, "usd")} />
          <KpiTile label="Stripe Transactions" value={totalTransactions.toString()} />
          <KpiTile label="Active Clubs" value={CLUBS.length.toString()} />
        </div>
      )}

      {/* Revenue chart */}
      {monthlyBars.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <RevenueChart months={monthlyBars} currency="usd" />
        </div>
      )}

      {/* Club cards */}
      <div style={{ marginBottom: 16 }}>
        <h2 className="bs-heading" style={{ fontSize: 20 }}>Clubs</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
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
              feesAvailable={feesAvailable}
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
