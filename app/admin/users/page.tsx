import Link from "next/link";
import { requireSuperAdmin } from "@/lib/get-session";
import { getAllUsers } from "@/lib/users-store";
import { CLUBS } from "@/lib/clubs";
import DeleteUserButton from "./DeleteUserButton";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireSuperAdmin();
  const users = getAllUsers();

  function clubNames(slugs: string[]): string {
    if (slugs.length === 0) return "—";
    return slugs
      .map((s) => {
        const club = CLUBS.find((c) => c.slug === s);
        return club ? `${club.flag} ${club.city}` : s;
      })
      .join(", ");
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">Dashboard</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Admin</span>
        <span>/</span>
        <span className="text-gray-900 font-medium">Users</span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Club Admin Accounts</h1>
          <p className="text-gray-500 mt-1">
            Manage club admin logins and their club assignments.
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New User
        </Link>
      </div>

      {/* Virtual admin note */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-6 text-sm text-blue-800">
        <strong>Super Admin</strong> — username:{" "}
        <code className="bg-blue-100 px-1 rounded">admin</code>, password:{" "}
        <code className="bg-blue-100 px-1 rounded">SITE_PASSWORD</code> env var.
        This account always exists and is not stored in the table below.
      </div>

      {users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-10 text-center text-gray-400">
          No club admins yet.{" "}
          <Link href="/admin/users/new" className="text-blue-600 hover:underline">
            Create the first one.
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Username
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Role
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Assigned Clubs
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Created
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {user.username}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                      Club Admin
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {clubNames(user.clubSlugs)}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </Link>
                      <DeleteUserButton id={user.id} username={user.username} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6">
        <Link
          href="/admin/splits"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          → Manage Revenue Splits
        </Link>
      </div>
    </div>
  );
}
