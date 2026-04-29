import Link from "next/link";
import { fetchCustomers } from "@/lib/stripe-client";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  let customers = null;
  let error: string | null = null;

  try {
    customers = await fetchCustomers(100);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Stripe error";
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">Dashboard</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Members</span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-500 mt-1">Stripe customers who have made payments</p>
        </div>
        {customers && (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Members</p>
            <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
          </div>
        )}
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error} — ensure <code className="bg-red-100 px-1 rounded">STRIPE_SECRET_KEY</code> is set.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Member Since</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-gray-400">No customers found.</td>
                </tr>
              )}
              {customers?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {c.name ?? <span className="text-gray-400 italic">No name</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="hover:text-blue-600">{c.email}</a>
                    ) : (
                      <span className="text-gray-400 italic">No email</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {new Date(c.created * 1000).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-gray-400">{c.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
