import { notFound } from "next/navigation";
import Link from "next/link";
import { getClub, formatAmount } from "@/lib/clubs";
import { fetchPaymentsForClub } from "@/lib/stripe-client";
import { getCashEntriesForClub } from "@/lib/cash-store";
import TransactionTable from "@/components/TransactionTable";
import CashTable from "@/components/CashTable";
import AddCashForm from "@/components/AddCashForm";

export const dynamic = "force-dynamic";

export default async function ClubPage({
  params,
}: {
  params: { slug: string };
}) {
  const club = getClub(params.slug);
  if (!club) notFound();

  let stripePayments = null;
  let stripeError: string | null = null;
  try {
    stripePayments = await fetchPaymentsForClub(club.slug);
  } catch (e: unknown) {
    stripeError = e instanceof Error ? e.message : "Stripe error";
  }

  const cashEntries = getCashEntriesForClub(club.slug);

  const stripeTotal =
    stripePayments
      ?.filter((p) => p.status === "succeeded")
      .reduce((s, p) => s + p.amount, 0) ?? 0;

  const cashTotal = cashEntries.reduce((s, e) => s + e.totalAmount, 0);

  const stripeCount =
    stripePayments?.filter((p) => p.status === "succeeded").length ?? 0;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{club.name}</span>
      </div>

      {/* Club header */}
      <div className={`rounded-xl ${club.accentBg} border border-gray-200 p-6 mb-8`}>
        <div className="flex items-center gap-4">
          <span className="text-5xl">{club.flag}</span>
          <div>
            <h1 className={`text-2xl font-bold ${club.accentText}`}>
              {club.name}
            </h1>
            <p className="text-gray-600">
              {club.city} · {club.currency.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Kpi
          label="Stripe Revenue"
          value={formatAmount(stripeTotal, club.currency)}
        />
        <Kpi label="Stripe Transactions" value={stripeCount.toString()} />
        <Kpi
          label="Cash Buy-ins"
          value={formatAmount(cashTotal, club.currency)}
        />
        <Kpi
          label="Combined Total"
          value={formatAmount(stripeTotal + cashTotal, club.currency)}
          highlight
        />
      </div>

      {/* Stripe payments */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Stripe Payments
        </h2>
        {club.matchFn(0, club.currency) === false && club.slug === "dc" ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
            <strong>No Stripe product exists for DC yet.</strong> Currently all
            online $26 payments are attributed to NYC (the only existing $26
            Stripe product — &ldquo;NYC BACKGAMMON SOCIETY&rdquo;). To split DC
            payments automatically, create a separate Stripe product + payment
            link for DC at whatever price you set, then update{" "}
            <code className="bg-amber-100 px-1 rounded">lib/clubs.ts</code> with
            the matching amount.
          </div>
        ) : stripeError ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
            {stripeError} — ensure{" "}
            <code className="bg-red-100 px-1 rounded">STRIPE_SECRET_KEY</code>{" "}
            is set.
          </div>
        ) : (
          <TransactionTable payments={stripePayments ?? []} currency={club.currency} />
        )}
      </section>

      {/* Cash buy-ins */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Cash Buy-ins</h2>
        </div>
        <AddCashForm clubSlug={club.slug} currency={club.currency} />
        <div className="mt-4">
          <CashTable entries={cashEntries} currency={club.currency} />
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "bg-brand-500 border-brand-600 text-white"
          : "bg-white border-gray-200"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
          highlight ? "text-blue-100" : "text-gray-400"
        }`}
      >
        {label}
      </p>
      <p className={`text-xl font-bold ${highlight ? "text-white" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}
