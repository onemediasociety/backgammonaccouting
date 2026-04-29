import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getClub, formatAmount } from "@/lib/clubs";
import { fetchPaymentsForClub } from "@/lib/stripe-client";
import { getCashEntriesForClub } from "@/lib/cash-store";
import TransactionTable from "@/components/TransactionTable";
import CashTable from "@/components/CashTable";
import AddCashForm from "@/components/AddCashForm";
import DateFilter, { parseDateRange } from "@/components/DateFilter";
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

  const range = parseDateRange({
    get: (k: string) => (sp as Record<string, string>)[k] ?? null,
  });

  const fromTs = toTs(range.from);
  const toTs_ = toTs(range.to, true);

  let stripePayments = null;
  let stripeError: string | null = null;
  try {
    stripePayments = await fetchPaymentsForClub(club.slug, 100, fromTs, toTs_);
  } catch (e: unknown) {
    stripeError = e instanceof Error ? e.message : "Stripe error";
  }

  const cashEntries = getCashEntriesForClub(
    club.slug,
    range.from ?? undefined,
    range.to ?? undefined
  );

  const stripeTotal =
    stripePayments
      ?.filter((p) => p.status === "succeeded")
      .reduce((s, p) => s + p.amount, 0) ?? 0;

  const cashTotal = cashEntries.reduce((s, e) => s + e.totalAmount, 0);
  const stripeCount = stripePayments?.filter((p) => p.status === "succeeded").length ?? 0;

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Kpi label="Stripe Revenue" value={formatAmount(stripeTotal, club.currency)} />
        <Kpi label="Stripe Transactions" value={stripeCount.toString()} />
        <Kpi label="Cash Buy-ins" value={formatAmount(cashTotal, club.currency)} />
        <Kpi label="Combined Total" value={formatAmount(stripeTotal + cashTotal, club.currency)} highlight />
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
    </div>
  );
}

function Kpi({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "bg-brand-500 border-brand-600 text-white" : "bg-white border-gray-200"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${highlight ? "text-blue-100" : "text-gray-400"}`}>
        {label}
      </p>
      <p className={`text-xl font-bold ${highlight ? "text-white" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
