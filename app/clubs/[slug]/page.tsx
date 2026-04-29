import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getClub, formatAmount } from "@/lib/clubs";
import { fetchPaymentsForClub, fetchFeesByClub } from "@/lib/stripe-client";
import { getCashEntriesForClub } from "@/lib/cash-store";
import { getExpensesForClub } from "@/lib/expenses-store";
import { getSplitForClub } from "@/lib/splits-store";
import { getSession } from "@/lib/get-session";
import TransactionTable from "@/components/TransactionTable";
import CashTable from "@/components/CashTable";
import AddCashForm from "@/components/AddCashForm";
import AddExpenseForm from "@/components/AddExpenseForm";
import ExpenseTable from "@/components/ExpenseTable";
import DateFilter from "@/components/DateFilter";
import { parseDateRange } from "@/lib/date-range";
import ExportButtons from "@/components/ExportButtons";

export const dynamic = "force-dynamic";

function toTs(dateStr: string | null, endOfDay = false): number | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}

export default async function ClubPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const club = getClub(slug);
  if (!club) notFound();

  const [session, split] = await Promise.all([
    getSession(),
    Promise.resolve(getSplitForClub(slug)),
  ]);

  const range = parseDateRange({
    get: (k: string) => (sp as Record<string, string>)[k] ?? null,
  });

  const fromTs = toTs(range.from);
  const toTs_ = toTs(range.to, true);

  let stripePayments = null;
  let stripeError: string | null = null;
  let stripeFees = 0;
  let feesAvailable = false;
  try {
    [stripePayments] = await Promise.all([
      fetchPaymentsForClub(club.slug, fromTs, toTs_),
    ]);
  } catch (e: unknown) {
    stripeError = e instanceof Error ? e.message : "Stripe error";
  }
  try {
    const feesByClub = await fetchFeesByClub(fromTs, toTs_);
    stripeFees = feesByClub[club.slug] ?? 0;
    feesAvailable = true;
  } catch { /* fees unavailable */ }

  const cashEntries = getCashEntriesForClub(club.slug, range.from ?? undefined, range.to ?? undefined);
  const expenses = getExpensesForClub(club.slug, range.from ?? undefined, range.to ?? undefined);

  const stripeTotal = stripePayments?.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amount, 0) ?? 0;
  const cashTotal = cashEntries.reduce((s, e) => s + e.totalAmount, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amountCents, 0);
  const stripeCount = stripePayments?.filter((p) => p.status === "succeeded").length ?? 0;
  const grossProfit = stripeTotal + cashTotal;
  const netIncome = grossProfit - stripeFees;

  const periodLabel = range.from && range.to
    ? `${range.from} – ${range.to}`
    : range.period === "all" || !range.period ? "All Time" : range.period;

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 12, color: "var(--ink-3)" }}>
        <Link href="/" style={{ color: "var(--ink-3)", textDecoration: "none" }} className="hover-underline">Dashboard</Link>
        <span style={{ opacity: 0.4 }}>/</span>
        <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{club.name}</span>
      </div>

      {/* Club header */}
      <div className="bs-card" style={{ padding: "24px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 44 }}>{club.flag}</span>
            <div>
              <h1 className="bs-heading" style={{ fontSize: 26, marginBottom: 2 }}>{club.name}</h1>
              <p className="bs-mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
                {club.city} · {club.currency.toUpperCase()}
              </p>
            </div>
          </div>
          <ExportButtons
            clubSlug={club.slug}
            clubName={club.name}
            currency={club.currency}
            from={range.from}
            to={range.to}
            period={range.period}
          />
        </div>
      </div>

      {/* Date filter */}
      <div className="bs-card" style={{ padding: "16px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span className="bs-label">Period</span>
          <span className="bs-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{periodLabel}</span>
        </div>
        <Suspense fallback={null}>
          <DateFilter />
        </Suspense>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
        <Kpi label="Stripe Revenue" value={formatAmount(stripeTotal, club.currency)} sub={`${stripeCount} txns`} />
        <Kpi label="Cash Buy-ins" value={formatAmount(cashTotal, club.currency)} />
        <Kpi label="Gross Profit" value={formatAmount(grossProfit, club.currency)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
        <Kpi label="Stripe Fees" value={feesAvailable ? `(${formatAmount(stripeFees, club.currency)})` : "—"} color="burgundy" sub={feesAvailable ? "deducted from net" : "unavailable"} />
        <Kpi label="Tracked Expenses" value={formatAmount(expenseTotal, club.currency)} color="burgundy" sub="not included in net" />
      </div>
      {/* Net profit — full width */}
      <div className="bs-card" style={{
        padding: "18px 24px", marginBottom: 28,
        background: netIncome >= 0 ? "var(--bs-green, #1f4d3a)" : "var(--burgundy, #8b1a1a)",
        border: "none",
      }}>
        <p className="bs-label" style={{ color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
          Net Profit {feesAvailable ? "(Gross − Stripe Fees)" : "(Gross, fees unavailable)"}
        </p>
        <p className="bs-mono" style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>
          {formatAmount(netIncome, club.currency)}
        </p>
      </div>

      {/* Stripe */}
      <section style={{ marginBottom: 36 }}>
        <h2 className="bs-heading" style={{ fontSize: 19, marginBottom: 14 }}>Stripe Payments</h2>
        {stripeError ? (
          <div style={{
            background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)",
            borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "var(--burgundy)",
          }}>
            {stripeError} — ensure <code style={{ background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 3 }}>STRIPE_SECRET_KEY</code> is set.
          </div>
        ) : (
          <TransactionTable payments={stripePayments ?? []} currency={club.currency} />
        )}
      </section>

      {/* Cash */}
      <section style={{ marginBottom: 36 }}>
        <h2 className="bs-heading" style={{ fontSize: 19, marginBottom: 14 }}>Cash Buy-ins</h2>
        <AddCashForm clubSlug={club.slug} currency={club.currency} />
        <div style={{ marginTop: 16 }}>
          <CashTable entries={cashEntries} currency={club.currency} />
        </div>
      </section>

      {/* Expenses */}
      <section style={{ marginBottom: 36 }}>
        <h2 className="bs-heading" style={{ fontSize: 19, marginBottom: 14 }}>Expenses</h2>
        <AddExpenseForm clubSlug={club.slug} currency={club.currency} />
        <div style={{ marginTop: 16 }}>
          <ExpenseTable entries={expenses} currency={club.currency} />
        </div>
      </section>

      {/* Revenue Split */}
      {split && (
        <section style={{ marginBottom: 36 }}>
          <h2 className="bs-heading" style={{ fontSize: 19, marginBottom: 14 }}>Revenue Split</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Owner */}
            <div className="bs-card" style={{ padding: "18px 22px" }}>
              <p className="bs-label" style={{ marginBottom: 6, color: "var(--brass)" }}>
                Global Owner · {split.ownerPct}%
              </p>
              <p className="bs-mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
                {formatAmount(Math.round(netIncome * split.ownerPct / 100), club.currency)}
              </p>
            </div>
            {/* Admin */}
            <div className="bs-card" style={{
              padding: "18px 22px",
              background: split.adminPct > 0 ? "var(--bs-green, #1f4d3a)" : "var(--paper-2)",
              border: split.adminPct > 0 ? "none" : "1px solid var(--rule)",
            }}>
              <p className="bs-label" style={{ marginBottom: 6, color: split.adminPct > 0 ? "rgba(255,255,255,0.55)" : "var(--ink-3)" }}>
                {session?.role === "club_admin" ? "Your Share" : "Club Admin"} · {split.adminPct}%
              </p>
              <p className="bs-mono" style={{ fontSize: 22, fontWeight: 700, color: split.adminPct > 0 ? "#fff" : "var(--ink-3)" }}>
                {formatAmount(Math.round(netIncome * split.adminPct / 100), club.currency)}
              </p>
            </div>
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 10 }}>
            Based on net profit of {formatAmount(netIncome, club.currency)} (Stripe + Cash − Stripe Fees).
            {split.adminPct === 0 && " Revenue goes fully to the global owner."}
            {session?.role === "super_admin" && (
              <Link href="/admin/splits" style={{ color: "var(--brass)", marginLeft: 8, textDecoration: "none" }}>
                Edit splits →
              </Link>
            )}
          </p>
        </section>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  color = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "default" | "burgundy" | "green";
}) {
  return (
    <div className="bs-card" style={{ padding: "16px 20px" }}>
      <p className="bs-label" style={{ marginBottom: 6 }}>{label}</p>
      <p
        className="bs-mono"
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: color === "burgundy" ? "var(--burgundy)" : color === "green" ? "var(--bs-green, #1f4d3a)" : "var(--ink)",
        }}
      >
        {value}
      </p>
      {sub && <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 3 }}>{sub}</p>}
    </div>
  );
}
