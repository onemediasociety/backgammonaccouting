import Link from "next/link";
import { requireSuperAdmin } from "@/lib/get-session";
import { getAllUsers } from "@/lib/users-store";
import { getAllClubs } from "@/lib/clubs-server";
import { getExtraClubs } from "@/lib/clubs-store";
import { getVenueMappings } from "@/lib/venues-store";
import VenueManager from "@/components/VenueManager";
import SplitsEditor from "@/components/SplitsEditor";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireSuperAdmin();
  const users = await getAllUsers();
  const pendingUsers = users.filter((u) => u.status === "pending");
  const allClubs = getAllClubs();
  const extraSlugs = new Set(getExtraClubs().map((c) => c.slug));
  const venues = getVenueMappings();
  const clubOptions = allClubs.map((c) => ({ slug: c.slug, city: c.city, flag: c.flag }));

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="bs-heading" style={{ fontSize: 28, marginBottom: 3 }}>Settings</h1>
        <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Admin · System configuration
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* User Management */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 className="bs-heading" style={{ fontSize: 18 }}>Admin Users</h2>
              {pendingUsers.length > 0 && (
                <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", padding: "2px 8px", borderRadius: 20, background: "rgba(184,144,66,0.15)", color: "var(--brass)", border: "1px solid rgba(184,144,66,0.3)" }}>
                  {pendingUsers.length} pending
                </span>
              )}
            </div>
            <Link href="/admin/users/new" style={{
              fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
              padding: "5px 12px", borderRadius: 7,
              background: "var(--ink)", color: "var(--brass)",
              textDecoration: "none", letterSpacing: "0.04em",
            }}>
              + New User
            </Link>
          </div>

          <div className="bs-card" style={{ overflow: "hidden", marginBottom: 12 }}>
            {/* Super admin row */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule)", display: "flex", alignItems: "center", gap: 10 }}>
              <div className="bs-avatar" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>SA</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>admin</div>
                <div className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>via SITE_PASSWORD env var</div>
              </div>
              <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", padding: "2px 8px", borderRadius: 20, background: "rgba(184,144,66,0.12)", color: "var(--brass)", border: "1px solid rgba(184,144,66,0.2)" }}>
                Super Admin
              </span>
            </div>

            {users.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                No club admins yet.{" "}
                <Link href="/admin/users/new" style={{ color: "var(--brass)" }}>Create the first one.</Link>
              </div>
            ) : (
              users.map((user) => {
                const isPending = user.status === "pending";
                return (
                <div key={user.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule)", display: "flex", alignItems: "center", gap: 10, background: isPending ? "rgba(184,144,66,0.03)" : undefined }}>
                  <div className="bs-avatar" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>
                    {user.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                      {user.username}
                      {isPending && <span style={{ fontSize: 9, fontFamily: "var(--font-dm-mono, monospace)", padding: "1px 6px", borderRadius: 10, background: "rgba(184,144,66,0.15)", color: "var(--brass)" }}>pending</span>}
                    </div>
                    <div className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.clubSlugs.map(s => allClubs.find(c => c.slug === s)?.city ?? s).join(", ") || (isPending ? "Awaiting city assignment" : "No clubs")}
                    </div>
                  </div>
                  <Link href={`/admin/users/${user.id}`} style={{
                    fontSize: 11, fontFamily: "var(--font-dm-mono, monospace)",
                    color: "var(--ink-3)", textDecoration: "none",
                    padding: "3px 8px", border: "1px solid var(--rule)", borderRadius: 6,
                  }}>
                    Edit
                  </Link>
                </div>
                );
              })
            )}
          </div>
          <Link href="/admin/users" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none" }}>
            View all users →
          </Link>
        </section>

        {/* Clubs Management */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 className="bs-heading" style={{ fontSize: 18 }}>Clubs & Cities</h2>
            <Link href="/admin/clubs/new" style={{
              fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
              padding: "5px 12px", borderRadius: 7,
              background: "var(--ink)", color: "var(--brass)",
              textDecoration: "none", letterSpacing: "0.04em",
            }}>
              + Add City
            </Link>
          </div>

          <div className="bs-card" style={{ overflow: "hidden" }}>
            {allClubs.map((club) => {
              const isDynamic = extraSlugs.has(club.slug);
              return (
                <div key={club.slug} style={{ padding: "11px 16px", borderBottom: "1px solid var(--rule)", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{club.flag}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{club.city}</div>
                    <div className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                      {club.currency.toUpperCase()} · /{club.slug}
                    </div>
                  </div>
                  {isDynamic ? (
                    <Link href={`/admin/clubs/${club.slug}`} style={{
                      fontSize: 11, fontFamily: "var(--font-dm-mono, monospace)",
                      color: "var(--ink-3)", textDecoration: "none",
                      padding: "3px 8px", border: "1px solid var(--rule)", borderRadius: 6,
                    }}>
                      Edit
                    </Link>
                  ) : (
                    <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink-3)", opacity: 0.5 }}>
                      built-in
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Venue Mappings */}
      <section style={{ marginTop: 28 }}>
        <div style={{ marginBottom: 12 }}>
          <h2 className="bs-heading" style={{ fontSize: 18, marginBottom: 3 }}>Venue Mappings</h2>
          <p style={{ fontSize: 12, color: "var(--ink-3)", margin: 0 }}>
            Map venue or product name keywords to a city. When a Stripe payment description contains a keyword (case-insensitive), it's attributed to that city.
          </p>
        </div>
        <div className="bs-card" style={{ overflow: "hidden", maxWidth: 560 }}>
          <VenueManager initial={venues} clubs={clubOptions} />
        </div>
      </section>

      {/* Revenue Splits */}
      <section style={{ marginTop: 28 }}>
        <div style={{ marginBottom: 12 }}>
          <h2 className="bs-heading" style={{ fontSize: 18, marginBottom: 3 }}>Revenue Splits</h2>
          <p style={{ fontSize: 12, color: "var(--ink-3)", margin: 0 }}>
            Configure how each club&apos;s net profit is divided. Names appear on payout statements. Percentages must total 100. Changes are saved permanently to cloud storage.
          </p>
        </div>
        <SplitsEditor />
      </section>
    </div>
  );
}
