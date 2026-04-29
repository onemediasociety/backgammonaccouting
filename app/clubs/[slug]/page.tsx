import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getClub, formatAmount } from "@/lib/clubs";
import { fetchPaymentsForClub } from "@/lib/stripe-client";
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
  try {
    stripePayments = await fetchPaymentsForClub(club.slug, fromTs, toTs_);
  } catch (e: unknown) {
    stripeError = e instanceof Error ? e.message : "Stripe error";
  }

  const cashEntries = getCashEntriesForClub(
    club.slug,
    range.from ?? undefined,
    range.to ?? undefined
  );

  const expenses = getExpensesForClub(
    club.slug,
    range.from ?? undefined,
    range.to ?? undefined
  );

  const stripeTotal =
    stripePayments
      ?.filter((p) => p.status === "succeeded")
      .reduce((s, p) => s + p.amount, 0) ?? 0;

  const cashTotal = cashEntries.reduce((s, e) => s + e.totalAmount, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amountCents, 0);
  const stripeCount = stripePayments?.filter((p) => p.status === "succeeded").length ?? 0;
  const netIncome = stripeTotal + cashTotal - expenseTotal;

  const periodLabel =
    range.from && range.to
      ? `${range.from} – ${range.to}`
      : range.period === "all" || !range.period
      ? "All Time"
      : range.period;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">Dashboard</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{club.name}</span>
      </div>

      <div className={`rounded-xl ${club.accentBg} border border-gray-200 p-6 mb-6`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{club.flag}</span>
            <div>
              <h1 className={`text-2xl font-bold ${club.accentText}`}>{club.name}</h1>
              <p className="text-gray-600">{club.city} · {club.currency.toUpperCase()}</p>
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-semibold text-gray-600">Period:</span>
          <span className="text-sm text-gray-400">{periodLabel}</span>
        </div>
        <Suspense fallback={null}>
          <DateFilter />
        </Suspense>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        <Kpi label="Stripe Revenue" value={formatAmount(stripeTotal, club.currency)} />
        <Kpi label="Stripe Transactions" value={stripeCount.toString()} />
        <Kpi label="Cash Buy-ins" value={formatAmount(cashTotal, club.currency)} />
        <Kpi label="Expenses" value={formatAmount(expenseTotal, club.currency)} color="red" />
        <Kpi label="Net Income" value={formatAmount(netIncome, club.currency)} highlight color={netIncome >= 0 ? "green" : "red"} />
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Stripe Payments</h2>
        {club.matchFn(0, club.currency) === false && club.slug === "dc" ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
            <strong>No Stripe product exists for DC yet.</strong> All online $26 payments are currently
            attributed to NYC. Create a separate DC product + payment link in Stripe, then update{" "}
            <code className="bg-amber-100 px-1 rounded">lib/clubs.ts</code> to match it.
          </div>
        ) : stripeError ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
            {stripeError} — ensure{" "}
            <code className="bg-red-100 px-1 rounded">STRIPE_SECRET_KEY</code> is set in Vercel env vars.
          </div>
        ) : (
          <TransactionTable payments={stripePayments ?? []} currency={club.currency} />
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Cash Buy-ins</h2>
        <AddCashForm clubSlug={club.slug} currency={club.currency} />
        <div className="mt-4">
          <CashTable entries={cashEntries} currency={club.currency} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Expenses</h2>
        <AddExpenseForm clubSlug={club.slug} currency={club.currency} />
        <div className="mt-4">
          <ExpenseTable entries={expenses} currency={club.currency} />
        </div>
      </section>

      {split && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Revenue Split</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">
                Global Owner ({split.ownerPct}%)
              </p>
              <p className="text-2xl font-bold text-blue-700">
                {formatAmount(Math.round(netIncome * split.ownerPct / 100), club.currency)}
              </p>
            </div>
            <div className={`rounded-xl border p-4 ${split.adminPct > 0 ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${split.adminPct > 0 ? "text-green-500" : "text-gray-400"}`}>
                {session?.role === "club_admin" ? "Your Share" : "Club Admin"} ({split.adminPct}%)
              </p>
              <p className={`text-2xl font-bold ${split.adminPct > 0 ? "text-green-700" : "text-gray-400"}`}>
                {formatAmount(Math.round(netIncome * split.adminPct / 100), club.currency)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Based on net income of {formatAmount(netIncome, club.currency)}.
            {split.adminPct === 0 && " This club's revenue goes fully to the global owner."}
            {session?.role === "super_admin" && (
              <Link href="/admin/splits" className="ml-2 text-blue-500 hover:underline">
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
  highlight = false,
  color = "default",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  color?: "default" | "red" | "green";
}) {
  const bg = highlight
    ? color === "green"
      ? "bg-green-600 border-green-700 text-white"
      : color === "red"
      ? "bg-red-600 border-red-700 text-white"
      : "bg-brand-500 border-brand-600 text-white"
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
    <div className={`rounded-xl border p-4 ${bg}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${labelCls}`}>
        {label}
      </p>
      <p className={`text-xl font-bold ${valueCls}`}>{value}</p>
    </div>
  );
}
