import Link from "next/link";
import { requireSuperAdmin } from "@/lib/get-session";
import { getAllUsers } from "@/lib/users-store";
import { getAllClubs } from "@/lib/clubs-server";
import DeleteUserButton from "./DeleteUserButton";
import InviteButton from "./InviteButton";
import ApproveButton from "./ApproveButton";

export const metadata = { title: "Users " };

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireSuperAdmin();
  const users = await getAllUsers();
  const allClubs = getAllClubs();

  function clubNames(slugs: string[]): string {
    if (slugs.length === 0) return "—";
    return slugs
      .map((s) => {
        const club = allClubs.find((c) => c.slug === s);
        return club ? `${club.flag} ${club.city}` : s;
      })
      .join(", ");
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
            <Link href="/admin" style={{ color: "inherit", textDecoration: "none" }}>Settings</Link>
            {" / "}Users
          </p>
          <h1 className="bs-heading" style={{ fontSize: 24 }}>Admin Users</h1>
        </div>
        <Link href="/admin/users/new" style={{
          fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
          padding: "8px 16px", borderRadius: 8,
          background: "var(--ink)", color: "var(--brass)",
          textDecoration: "none", letterSpacing: "0.04em",
        }}>
          + New User
        </Link>
      </div>

      {/* Super admin note */}
      <div className="bs-card" style={{ padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 16 }}>ℹ️</span>
        <p style={{ fontSize: 12, color: "var(--ink-2)", margin: 0 }}>
          <strong>Super Admin</strong> account (username: <code style={{ fontFamily: "var(--font-dm-mono, monospace)", background: "var(--paper-2)", padding: "1px 5px", borderRadius: 4 }}>admin</code>) is authenticated via the{" "}
          <code style={{ fontFamily: "var(--font-dm-mono, monospace)", background: "var(--paper-2)", padding: "1px 5px", borderRadius: 4 }}>SITE_PASSWORD</code> environment variable and is not listed below.
        </p>
      </div>

      {users.length === 0 ? (
        <div className="bs-card" style={{ padding: "40px 20px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
          No club admins yet.{" "}
          <Link href="/admin/users/new" style={{ color: "var(--brass)" }}>Create the first one.</Link>
        </div>
      ) : (
        <div className="bs-card" style={{ overflow: "hidden" }}>
          <table className="bs-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Assigned Clubs</th>
                <th>Pref. Currency</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="bs-avatar" style={{ width: 28, height: 28, fontSize: 10, flexShrink: 0 }}>
                        {user.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{user.username}</span>
                        {user.email && (
                          <p className="bs-mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 1 }}>{user.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", padding: "2px 8px", borderRadius: 20, background: user.role === "super_admin" ? "rgba(139,26,26,0.12)" : "rgba(139,26,26,0.08)", color: "var(--burgundy)", border: "1px solid rgba(139,26,26,0.15)" }}>
                      {user.role === "super_admin" ? "Super Admin" : "Club Admin"}
                    </span>
                    {user.status === "pending" && (
                      <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", padding: "2px 8px", borderRadius: 20, background: "rgba(184,144,66,0.1)", color: "var(--brass)", border: "1px solid rgba(184,144,66,0.2)", marginLeft: 6 }}>
                        Pending
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--ink-2)" }}>
                    {clubNames(user.clubSlugs)}
                  </td>
                  <td className="bs-mono" style={{ fontSize: 11, color: user.preferredCurrency ? "var(--ink)" : "var(--ink-3)" }}>
                    {user.preferredCurrency ? user.preferredCurrency.toUpperCase() : "—"}
                  </td>
                  <td className="bs-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                      {user.status === "pending" && (
                        <ApproveButton userId={user.id} clubSlugs={user.clubSlugs} />
                      )}
                      <InviteButton userId={user.id} username={user.username} email={user.email} />
                      <Link href={`/admin/users/${user.id}`} style={{
                        fontSize: 11, fontFamily: "var(--font-dm-mono, monospace)",
                        color: "var(--ink-3)", textDecoration: "none",
                        padding: "3px 8px", border: "1px solid var(--rule)", borderRadius: 6,
                      }}>
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
    </div>
  );
}
