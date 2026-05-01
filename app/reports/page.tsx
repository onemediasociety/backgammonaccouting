import { Suspense } from "react";
import Link from "next/link";
import { CLUBS, formatAmount } from "@/lib/clubs";
import { buildClubSummaries, fetchFeesByClub } from "@/lib/stripe-client";
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

function KpiCard({ label, value, sub, highlight = false, negative = false }: {
  label: string; value: string; sub?: string; highlight?: boolean; negative?: boolean;
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
      <p className="bs-mono" style={{
        fontSize: 20, fontWeight: 700,
        color: highlight ? "var(--brass)" : negative ? "var(--burgundy)" : "var(--ink)",
      }}>
        {value}
      </p>
      {sub && <p className="bs-mono" style={{ fontSize: 10, color: highlight ? "rgba(240,235,226,0.35)" : "var(--ink-3)", marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bs-skeleton" style={{ height: 88, borderRadius: 12 }} />
        ))}
      </div>
      <div className="bs-skeleton" style={{ height: 380, borderRadius: 12, marginBottom: 28 }} />
      <div className="bs-skeleton" style={{ height: 160, borderRadius: 12 }} />
    </>
  );
}

async function ReportsData({
  fromTs, toTs_, range,
}: {
  fromTs: number | undefined;
  toTs_: number | undefined;
  range: { from: string | null; to: string | null };
}) {
  let summaries = null;
  let feesByClub: Record<string, number> = {};
  let feesAvailable = false;
  let error: string | null = null;

  try {
    [summaries, feesByClub] = await Promise.all([
      buildClubSummaries(fromTs, toTs_),
      fetchFeesByClub(fromTs, toTs_).then((f) => { feesAvailable = true; return f; }).catch(() => ({})),
    ]);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Stripe error";
  }

  const [cashTotals, expenseTotals] = await Promise.all([
    getCashTotalsPerClub(range.from ?? undefined, range.to ?? undefined),
    getExpenseTotalsPerClub(range.from ?? undefined, range.to ?? undefined),
  ]);

  const rows = CLUBS.map((club) => {
    const stripeCents = summaries?.find((s) => s.club.slug === club.slug)?.totalCents ?? 0;
    const cashCents = cashTotals[club.slug] ?? 0;
    const feeCents = feesByClub[club.slug] ?? 0;
    const expenseCents = expenseTotals[club.slug] ?? 0;
    const grossCents = stripeCents + cashCents;
    const netCents = grossCents - feeCents;
    return { club, stripeCents, cashCents, grossCents, feeCents, expenseCents, netCents };
  });

  const grandGross = rows.filter((r) => r.club.currency === "usd").reduce((s, r) => s + r.grossCents, 0);
  const grandFees = rows.filter((r) => r.club.currency === "usd").reduce((s, r) => s + r.feeCents, 0);
  const grandNet = grandGross - grandFees;

  return (
    <>
      {error && (
        <div style={{
          background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)",
          borderRadius: 10, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: "var(--burgundy)",
        }}>
          Stripe error: {error}. Cash and expense data still shown.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <KpiCard label="Gross Profit (USD)" value={formatAmount(grandGross, "usd")} sub="Stripe + Cash" />
        <KpiCard label="Stripe Fees (USD)" value={feesAvailable ? `(${formatAmount(grandFees, "usd")})` : "—"} negative />
        <KpiCard label="Net Profit (USD)" value={formatAmount(grandNet, "usd")} highlight />
      </div>

      <div className="bs-card" style={{ overflow: "hidden", marginBottom: 28 }}>
        <table className="bs-table">
          <thead>
            <tr>
              <th>Club</th>
              <th style={{ textAlign: "right" }}>Stripe</th>
              <th style={{ textAlign: "right" }}>Cash</th>
              <th style={{ textAlign: "right" }}>Gross Profit</th>
              {feesAvailable && <th style={{ textAlign: "right" }}>Stripe Fees</th>}
              <th style={{ textAlign: "right" }}>Net Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ club, stripeCents, cashCents, grossCents, feeCents, netCents }) => (
              <tr key={club.slug}>
                <td>
                  <Link href={`/clubs/${club.slug}`} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}>
                    <span style={{ fontSize: 16 }}>{club.flag}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{club.city}</div>
                      <div className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{club.currency.toUpperCase()}</div>
                    </div>
                  </Link>
                </td>
                <td className="bs-amount" style={{ textAlign: "right", fontSize: 12 }}>{formatAmount(stripeCents, club.currency)}</td>
                <td className="bs-amount" style={{ textAlign: "right", fontSize: 12 }}>{formatAmount(cashCents, club.currency)}</td>
                <td className="bs-amount" style={{ textAlign: "right", fontSize: 12, fontWeight: 600 }}>{formatAmount(grossCents, club.currency)}</td>
                {feesAvailable && (
                  <td className="bs-amount bs-amount-negative" style={{ textAlign: "right", fontSize: 12 }}>
                    {feeCents > 0 ? `(${formatAmount(feeCents, club.currency)})` : "—"}
                  </td>
                )}
                <td className="bs-amount" style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: netCents >= 0 ? "var(--green, #1f4d3a)" : "var(--burgundy)" }}>
                  {formatAmount(netCents, club.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.some((r) => r.expenseCents > 0) && (
        <section>
          <h2 className="bs-heading" style={{ fontSize: 18, marginBottom: 4 }}>Tracked Expenses by Club</h2>
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 16 }}>
            For reference only — not deducted from Net Profit.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {rows.filter((r) => r.expenseCents > 0).map(({ club, expenseCents, grossCents }) => {
              const pct = grossCents > 0 ? Math.round((expenseCents / grossCents) * 100) : 0;
              return (
                <div key={club.slug} className="bs-card" style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 18 }}>{club.flag}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{club.city}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--ink-3)" }}>Expenses</span>
                    <span style={{ fontWeight: 600, color: "var(--burgundy)" }}>{formatAmount(expenseCents, club.currency)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
                    <span style={{ color: "var(--ink-3)" }}>% of Gross</span>
                    <span style={{ fontWeight: 600, color: "var(--ink-2)" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "var(--rule)", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "var(--burgundy)", borderRadius: 2, width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
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

  const periodLabel = range.from && range.to
    ? `${range.from} – ${range.to}`
    : "All Time";

  return (
    <div>
      <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Overview</Link>
        {" / "}Reports
      </p>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="bs-heading" style={{ fontSize: 28, marginBottom: 3 }}>Profit & Loss</h1>
          <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            All clubs · {periodLabel}
          </p>
        </div>
        <ExportButtons from={range.from} to={range.to} period={range.period} mode="pnl" />
      </div>

      <div className="bs-card" style={{ padding: "14px 18px", marginBottom: 24 }}>
        <Suspense fallback={null}>
          <DateFilter />
        </Suspense>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <ReportsData fromTs={fromTs} toTs_={toTs_} range={range} />
      </Suspense>
    </div>
  );
}
