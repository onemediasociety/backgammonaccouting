import { buildClubSummaries, fetchBalance } from "@/lib/stripe-client";
import { getCashTotalsPerClub } from "@/lib/cash-store";
import { formatAmount, CLUBS } from "@/lib/clubs";
import ClubCard from "@/components/ClubCard";

export const dynamic = "force-dynamic";

function BalancePill({
  label,
  amount,
  currency,
}: {
  label: string;
  amount: number;
  currency: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-gray-900">
        {formatAmount(amount, currency)}
      </p>
    </div>
  );
}

export default async function DashboardPage() {
  let summaries = null;
  let balance = null;
  let cashTotals: Record<string, number> = {};
  let error: string | null = null;

  try {
    [summaries, balance, cashTotals] = await Promise.all([
      buildClubSummaries(),
      fetchBalance(),
      Promise.resolve(getCashTotalsPerClub()),
    ]);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  const grandTotalUSD = summaries
    ?.filter((s) => s.club.currency === "usd")
    .reduce((sum, s) => sum + s.totalCents, 0) ?? 0;

  const totalTransactions = summaries?.reduce(
    (sum, s) => sum + s.successCount,
    0
  ) ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          🎲 The Backgammon Society
        </h1>
        <p className="mt-1 text-gray-500">Accounting Dashboard — All Clubs</p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 mb-8">
          <h2 className="text-red-800 font-semibold mb-1">
            Stripe Connection Error
          </h2>
          <p className="text-red-700 text-sm">{error}</p>
          <p className="text-red-600 text-sm mt-2">
            Make sure{" "}
            <code className="bg-red-100 px-1 rounded">STRIPE_SECRET_KEY</code>{" "}
            is set in your <code className="bg-red-100 px-1 rounded">.env.local</code>.
          </p>
        </div>
      ) : null}

      {/* Stripe balance summary */}
      {balance && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Stripe Balance
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 divide-x divide-gray-100">
            {balance.available.map((b) => (
              <BalancePill
                key={b.currency + "av"}
                label={`Available (${b.currency.toUpperCase()})`}
                amount={b.amount}
                currency={b.currency}
              />
            ))}
            {balance.pending.map((b) =>
              b.amount > 0 ? (
                <BalancePill
                  key={b.currency + "pe"}
                  label={`Pending (${b.currency.toUpperCase()})`}
                  amount={b.amount}
                  currency={b.currency}
                />
              ) : null
            )}
          </div>
        </div>
      )}

      {/* KPI strip */}
      {summaries && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Total USD Revenue
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatAmount(grandTotalUSD, "usd")}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Stripe Transactions
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {totalTransactions}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Active Clubs
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {CLUBS.length}
            </p>
          </div>
        </div>
      )}

      {/* Club cards grid */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Clubs</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CLUBS.map((club) => {
          const summary = summaries?.find((s) => s.club.slug === club.slug);
          const cashTotal = cashTotals[club.slug] ?? 0;
          return (
            <ClubCard
              key={club.slug}
              club={club}
              stripeTotal={summary?.totalCents ?? 0}
              stripeCount={summary?.successCount ?? 0}
              cashTotal={cashTotal}
              hasError={!!error}
            />
          );
        })}
      </div>
    </div>
  );
}
