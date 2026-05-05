import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getClub, formatAmount } from "@/lib/clubs";
import { fetchPaymentsForClub, fetchFeesByClub } from "@/lib/stripe-client";
import { getCashEntriesForClub } from "@/lib/cash-store";
import { getExpensesForClub } from "@/lib/expenses-store";
import { getSplitForClub } from "@/lib/splits-store";
import { getAllUsers } from "@/lib/users-store";
import { convertCents } from "@/lib/fx-rates";
import { getSession } from "@/lib/get-session";
import TransactionTable from "@/components/TransactionTable";
import CashSection from "@/components/CashSection";
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

// ── Skeleton shown while Stripe data loads ────────────────────────────────────
function StripeSkeleton() {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bs-skeleton" style={{ height: 76, borderRadius: 12 }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bs-skeleton" style={{ height: 76, borderRadius: 12 }} />
        ))}
      </div>
      <div className="bs-skeleton" style={{ height: 80, borderRadius: 12, marginBottom: 28 }} />
      <div className="bs-skeleton" style={{ height: 260, borderRadius: 12, marginBottom: 36 }} />
      <div className="bs-skeleton" style={{ height: 100, borderRadius: 12, marginBottom: 36 }} />
    </>
  );
}

// ── Stripe-dependent content (streams in) ────────────────────────────────────
async function StripeData({
  slug, currency, fromTs, toTs_, range,
}: {
  slug: string;
  currency: string;
  fromTs: number | undefined;
  toTs_: number | undefined;
  range: { from: string | null; to: string | null };
}) {
  const session = await getSession();
  const split = await getSplitForClub(slug);
  const allUsers = await getAllUsers();
  const [cashEntries, expenses] = await Promise.all([
    getCashEntriesForClub(slug, range.from ?? undefined, range.to ?? undefined),
    getExpensesForClub(slug, range.from ?? undefined, range.to ?? undefined),
  ]);
  const cashTotal = cashEntries.reduce((s, e) => s + e.totalAmount, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amountCents, 0);

  let stripePayments = null;
  let stripeError: string | null = null;
  let stripeFees = 0;
  let feesAvailable = false;

  try {
    [stripePayments] = await Promise.all([
      fetchPaymentsForClub(slug, fromTs, toTs_),
    ]);
  } catch (e: unknown) {
    stripeError = e instanceof Error ? e.message : "Stripe error";
  }

  try {
    const feesByClub = await fetchFeesByClub(fromTs, toTs_);
    stripeFees = feesByClub[slug] ?? 0;
    feesAvailable = true;
  } catch { /* fees unavailable */ }

  const club = getClub(slug)!;
  const stripeRate = club.stripeToClubRate ?? 1; // conversion factor from Stripe currency to club currency
  const stripeCurrency = club.stripePaymentCurrency ?? currency;
  const isCrossCurrency = !!club.stripePaymentCurrency && club.stripePaymentCurrency !== currency;

  const succeededPayments = stripePayments?.filter((p) => p.status === "succeeded") ?? [];
  const stripeTotalNative = succeededPayments.reduce((s, p) => s + p.amount, 0); // in Stripe payment currency
  const stripeTotal = Math.round(stripeTotalNative * stripeRate); // in club currency
  const stripeFeeConverted = Math.round(stripeFees * stripeRate); // fees also in club currency
  const stripeCount = succeededPayments.length;
  const grossProfit = stripeTotal + cashTotal;
  const netIncome = grossProfit - stripeFeeConverted - expenseTotal;

  // Exchange rate note (only for same-currency clubs using fee data)
  let feeRateNote: string | null = null;
  if (!isCrossCurrency && currency !== "usd" && feesAvailable && stripeFees > 0) {
    const totalFeeUsd = succeededPayments.reduce((s, p) => s + p.feeUsd, 0);
    if (totalFeeUsd > 0) {
      const localPerUsd = stripeFees / totalFeeUsd;
      feeRateNote = `avg 1 USD = ${localPerUsd.toFixed(3)} ${currency.toUpperCase()}`;
    }
  }

  return (
    <>
      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
        <Kpi label="Stripe Revenue" value={formatAmount(stripeTotal, currency)} sub={isCrossCurrency ? `${stripeCount} txns · orig. ${formatAmount(stripeTotalNative, stripeCurrency)}` : `${stripeCount} txns`} />
        <Kpi label="Cash Buy-ins" value={formatAmount(cashTotal, currency)} />
        <Kpi label="Gross Profit" value={formatAmount(grossProfit, currency)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
        <Kpi label="Stripe Fees" value={feesAvailable ? `(${formatAmount(stripeFees, currency)})` : "—"} color="burgundy" sub={feesAvailable ? `deducted from net${feeRateNote ? ` · ${feeRateNote}` : ""}` : "unavailable"} />
        <Kpi label="Tracked Expenses" value={expenseTotal > 0 ? formatAmount(expenseTotal, currency) : "—"} color="burgundy" sub={expenseTotal > 0 ? "deducted from net revenue" : "none recorded"} />
      </div>

      {/* Net profit banner */}
      <div className="bs-card" style={{
        padding: "18px 24px", marginBottom: 28,
        background: netIncome >= 0 ? "var(--bs-green, #1f4d3a)" : "var(--burgundy, #8b1a1a)",
        border: "none",
      }}>
        <p className="bs-label" style={{ color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
          Net Revenue {feesAvailable ? "(Gross − Stripe Fees − Expenses)" : "(Gross − Expenses, fees unavailable)"}
        </p>
        <p className="bs-mono" style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>
          {formatAmount(netIncome, currency)}
        </p>
      </div>

      {/* Stripe Payments */}
      <section style={{ marginBottom: 36 }}>
        <h2 className="bs-heading" style={{ fontSize: 19, marginBottom: 14 }}>Stripe Payments</h2>
        {stripeError ? (
          <div style={{
            background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)",
            borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "var(--burgundy)",
          }}>
            {stripeError}
          </div>
        ) : (
          <TransactionTable payments={stripePayments ?? []} currency={currency} />
        )}
      </section>

      {/* Revenue Split */}
      {split && split.recipients.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 className="bs-heading" style={{ fontSize: 19, marginBottom: 14 }}>Revenue Split</h2>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(split.recipients.length, 3)}, 1fr)`, gap: 14 }}>
            {split.recipients.map((r, i) => {
              const isGlobal = r.name === "Global";
              const isAdmin = !isGlobal;
              const splitAmount = Math.round(netIncome * r.pct / 100);
              const flatFee = r.flatFeeCents ?? 0;
              const expensesReimbursed = expenses
                .filter((e) => e.paidBy && e.paidBy.toLowerCase() === r.name.toLowerCase())
                .reduce((s, e) => s + e.amountCents, 0);
              const totalAmount = splitAmount + flatFee + expensesReimbursed;
              const hasFlatFee = flatFee > 0;
              const hasReimbursement = expensesReimbursed > 0;
              const parts: string[] = [];
              if (hasFlatFee || hasReimbursement) parts.push(`${formatAmount(splitAmount, currency)} split`);
              if (hasFlatFee) parts.push(`${formatAmount(flatFee, currency)} flat fee`);
              if (hasReimbursement) parts.push(`${formatAmount(expensesReimbursed, currency)} exp. reimbursed`);

              // Preferred currency conversion
              const linkedUser = allUsers.find(
                (u) => u.recipientName && u.recipientName.toLowerCase() === r.name.toLowerCase()
              );
              const prefCurrency = linkedUser?.preferredCurrency;
              const showConversion = prefCurrency && prefCurrency !== currency;
              const convertedAmount = showConversion ? convertCents(totalAmount, currency, prefCurrency!) : null;

              return (
                <div key={i} className="bs-card" style={{
                  padding: "18px 22px",
                  background: isAdmin && r.pct > 0 ? "var(--bs-green, #1f4d3a)" : undefined,
                  border: isAdmin && r.pct > 0 ? "none" : undefined,
                }}>
                  <p className="bs-label" style={{
                    marginBottom: 6,
                    color: isGlobal ? "var(--brass)" : isAdmin && r.pct > 0 ? "rgba(255,255,255,0.55)" : "var(--ink-3)",
                  }}>
                    {r.name} · {r.pct}%
                  </p>
                  <p className="bs-mono" style={{
                    fontSize: 22, fontWeight: 700,
                    color: isAdmin && r.pct > 0 ? "#fff" : "var(--ink)",
                  }}>
                    {formatAmount(totalAmount, currency)}
                  </p>
                  {convertedAmount !== null && (
                    <p className="bs-mono" style={{
                      fontSize: 13, marginTop: 2, fontWeight: 600,
                      color: isAdmin && r.pct > 0 ? "rgba(255,255,255,0.8)" : "var(--brass)",
                    }}>
                      ≈ {formatAmount(convertedAmount, prefCurrency!)}
                    </p>
                  )}
                  {parts.length > 0 && (
                    <p className="bs-mono" style={{
                      fontSize: 10, marginTop: 4,
                      color: isAdmin && r.pct > 0 ? "rgba(255,255,255,0.55)" : "var(--ink-3)",
                    }}>
                      {parts.join(" + ")}
                    </p>
                  )}
                  {showConversion && (
                    <p className="bs-mono" style={{
                      fontSize: 9, marginTop: 3,
                      color: isAdmin && r.pct > 0 ? "rgba(255,255,255,0.4)" : "var(--ink-3)",
                    }}>
                      indicative rate · preferred currency
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 10 }}>
            Based on net revenue of {formatAmount(netIncome, currency)} (Stripe + Cash − Stripe Fees − Expenses).
            Expense reimbursements are added back to each person&apos;s total.
            {session?.role === "super_admin" && (
              <Link href="/admin/splits" style={{ color: "var(--brass)", marginLeft: 8, textDecoration: "none" }}>
                Edit splits →
              </Link>
            )}
          </p>
        </section>
      )}
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function ClubPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await getSession();

  const club = getClub(slug);
  if (!club) notFound();

  const range = parseDateRange({
    get: (k: string) => (sp as Record<string, string>)[k] ?? null,
  });

  const fromTs = toTs(range.from);
  const toTs_ = toTs(range.to, true);

  // These are instant file reads — no Stripe needed
  const [cashEntries, expenses] = await Promise.all([
    getCashEntriesForClub(club.slug, range.from ?? undefined, range.to ?? undefined),
    getExpensesForClub(club.slug, range.from ?? undefined, range.to ?? undefined),
  ]);
  const expenseTotal = expenses.reduce((s, e) => s + e.amountCents, 0);

  const periodLabel = range.from && range.to
    ? `${range.from} – ${range.to}`
    : range.period === "all" || !range.period ? "All Time" : range.period;

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 12, color: "var(--ink-3)" }}>
        <Link href="/" style={{ color: "var(--ink-3)", textDecoration: "none" }}>Dashboard</Link>
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

      {/* Stripe-dependent sections — stream in */}
      <Suspense fallback={<StripeSkeleton />}>
        <StripeData
          slug={club.slug}
          currency={club.currency}
          fromTs={fromTs}
          toTs_={toTs_}
          range={range}
        />
      </Suspense>

      {/* Cash — instant, no Stripe needed */}
      <section style={{ marginBottom: 36 }}>
        <h2 className="bs-heading" style={{ fontSize: 19, marginBottom: 14 }}>Cash Buy-ins</h2>
        <CashSection initialEntries={cashEntries} clubSlug={club.slug} currency={club.currency} />
      </section>

      {/* Expenses — instant, no Stripe needed */}
      <section style={{ marginBottom: 36 }}>
        <h2 className="bs-heading" style={{ fontSize: 19, marginBottom: 14 }}>
          Expenses
          {expenseTotal > 0 && (
            <span style={{ fontSize: 13, fontWeight: 400, color: "var(--ink-3)", marginLeft: 10 }}>
              {formatAmount(expenseTotal, club.currency)} tracked
            </span>
          )}
        </h2>
        <AddExpenseForm clubSlug={club.slug} currency={club.currency} isSuperAdmin={session?.role === "super_admin"} />
        <div style={{ marginTop: 16 }}>
          <ExpenseTable entries={expenses} currency={club.currency} />
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, color = "default" }: {
  label: string; value: string; sub?: string; color?: "default" | "burgundy" | "green";
}) {
  return (
    <div className="bs-card" style={{ padding: "16px 20px" }}>
      <p className="bs-label" style={{ marginBottom: 6 }}>{label}</p>
      <p className="bs-mono" style={{
        fontSize: 18, fontWeight: 600,
        color: color === "burgundy" ? "var(--burgundy)" : color === "green" ? "var(--bs-green, #1f4d3a)" : "var(--ink)",
      }}>
        {value}
      </p>
      {sub && <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 3 }}>{sub}</p>}
    </div>
  );
}
