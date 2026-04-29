import Link from "next/link";
import { fetchPayouts } from "@/lib/stripe-client";
import { formatAmount } from "@/lib/clubs";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  let payouts = null;
  let error: string | null = null;

  try {
    payouts = await fetchPayouts(50);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Stripe error";
  }

  const totalPaid = payouts
    ?.filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0) ?? 0;

  const totalInTransit = payouts
    ?.filter((p) => p.status === "in_transit")
    .reduce((s, p) => s + p.amount, 0) ?? 0;

  function statusBadge(status: string) {
    const cls: Record<string, string> = {
      paid: "bg-green-50 text-green-700",
      in_transit: "bg-blue-50 text-blue-700",
      pending: "bg-amber-50 text-amber-700",
      failed: "bg-red-50 text-red-700",
      canceled: "bg-gray-100 text-gray-500",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls[status] ?? "bg-gray-100 text-gray-500"}`}>
        {status.replace("_", " ")}
      </span>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">Dashboard</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Payouts</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stripe Payouts</h1>
        <p className="text-gray-500 mt-1">Bank transfers from your Stripe account</p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error} — ensure <code className="bg-red-100 px-1 rounded">STRIPE_SECRET_KEY</code> is set.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <KpiBox label="Payouts (Last 50)" value={String(payouts?.length ?? 0)} />
            <KpiBox label="Paid Out (USD)" value={formatAmount(totalPaid, "usd")} color="green" />
            <KpiBox label="In Transit" value={formatAmount(totalInTransit, "usd")} color="blue" />
            <KpiBox label="Failed" value={String(payouts?.filter((p) => p.status === "failed").length ?? 0)} color="red" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Arrival</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payouts?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-400">No payouts found.</td>
                  </tr>
                )}
                {payouts?.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-700">
                      {new Date(p.created * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {new Date(p.arrivalDate * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-5 py-3">{statusBadge(p.status)}</td>
                    <td className="px-5 py-3 text-gray-600">{p.description ?? "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {formatAmount(p.amount, p.currency)}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-gray-400">{p.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function KpiBox({ label, value, color = "default" }: { label: string; value: string; color?: string }) {
  const valueCls =
    color === "green" ? "text-green-600" :
    color === "red" ? "text-red-600" :
    color === "blue" ? "text-blue-600" :
    "text-gray-900";
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${valueCls}`}>{value}</p>
    </div>
  );
}
