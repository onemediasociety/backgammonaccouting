import Link from "next/link";
import { fetchAllPayments } from "@/lib/stripe-client";
import { CLUBS } from "@/lib/clubs";
import { formatAmount } from "@/lib/clubs";


export const dynamic = "force-dynamic";

interface Member {
  key: string;
  name: string | null;
  email: string | null;
  firstSeen: number;
  lastSeen: number;
  totalSpend: number;
  currency: string;
  paymentCount: number;
  clubs: string[];
}

export default async function MembersPage() {
  let members: Member[] = [];
  let error: string | null = null;

  try {
    // Fetch up to 2000 payments to cover full history
    const payments = await fetchAllPayments(undefined, undefined, 2000);
    const succeeded = payments.filter((p) => p.status === "succeeded");

    // Deduplicate by email (lowercased), then name as fallback key
    const map = new Map<string, Member>();
    for (const p of succeeded) {
      const key = p.customerEmail?.toLowerCase().trim()
        ?? p.customerName?.toLowerCase().trim()
        ?? `anon-${p.id}`;

      const existing = map.get(key);
      const clubCity = CLUBS.find((c) => c.slug === p.clubSlug)?.city ?? p.clubSlug;

      if (existing) {
        existing.lastSeen = Math.max(existing.lastSeen, p.created);
        existing.firstSeen = Math.min(existing.firstSeen, p.created);
        existing.paymentCount += 1;
        if (existing.currency === p.currency) existing.totalSpend += p.amount;
        if (!existing.clubs.includes(clubCity)) existing.clubs.push(clubCity);
        if (!existing.name && p.customerName) existing.name = p.customerName;
        if (!existing.email && p.customerEmail) existing.email = p.customerEmail;
      } else {
        map.set(key, {
          key,
          name: p.customerName,
          email: p.customerEmail,
          firstSeen: p.created,
          lastSeen: p.created,
          totalSpend: p.amount,
          currency: p.currency,
          paymentCount: 1,
          clubs: [clubCity],
        });
      }
    }

    // Sort by most recent payment first
    members = Array.from(map.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Stripe error";
  }

  const namedCount = members.filter((m) => m.name || m.email).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="bs-heading" style={{ fontSize: 28, marginBottom: 3 }}>Members</h1>
          <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Unique payers · derived from Stripe payments
          </p>
        </div>
        {!error && (
          <div style={{ display: "flex", gap: 12 }}>
            <div className="bs-card" style={{ padding: "12px 20px", textAlign: "center" }}>
              <p className="bs-label" style={{ marginBottom: 3 }}>Total Members</p>
              <p className="bs-mono" style={{ fontSize: 22, fontWeight: 700 }}>{members.length}</p>
            </div>
            <div className="bs-card" style={{ padding: "12px 20px", textAlign: "center" }}>
              <p className="bs-label" style={{ marginBottom: 3 }}>Identified</p>
              <p className="bs-mono" style={{ fontSize: 22, fontWeight: 700 }}>{namedCount}</p>
            </div>
          </div>
        )}
      </div>

      {error ? (
        <div style={{
          background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)",
          borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "var(--burgundy)",
        }}>
          {error} — ensure <code style={{ background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 3 }}>STRIPE_SECRET_KEY</code> is set.
        </div>
      ) : (
        <div className="bs-card" style={{ overflow: "hidden" }}>
          <table className="bs-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Clubs</th>
                <th style={{ textAlign: "right" }}>Payments</th>
                <th style={{ textAlign: "right" }}>Total Spend</th>
                <th>First Seen</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--ink-3)", fontSize: 13 }}>
                    No payments found.
                  </td>
                </tr>
              )}
              {members.map((m) => (
                <tr key={m.key}>
                  <td style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                    {m.name ?? <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--ink-2)" }}>
                    {m.email ? (
                      <a href={`mailto:${m.email}`} style={{ color: "var(--brass)", textDecoration: "none" }}>{m.email}</a>
                    ) : (
                      <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {m.clubs.join(", ")}
                  </td>
                  <td className="bs-mono" style={{ textAlign: "right", fontSize: 12 }}>{m.paymentCount}</td>
                  <td className="bs-amount" style={{ textAlign: "right", fontSize: 12 }}>
                    {formatAmount(m.totalSpend, m.currency)}
                  </td>
                  <td className="bs-mono" style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                    {new Date(m.firstSeen * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="bs-mono" style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                    {new Date(m.lastSeen * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
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
