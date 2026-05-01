"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { BankDetails } from "@/lib/users-store";
import type { ProcessedPayout } from "@/lib/payout-store";

interface UserProfile {
  id: string;
  username: string;
  role: string;
  recipientName?: string;
  bankDetails?: BankDetails;
  clubSlugs: string[];
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--rule)", background: "var(--paper)",
  color: "var(--ink)", fontSize: 13, fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10,
  fontFamily: "var(--font-dm-mono, monospace)",
  color: "var(--ink-3)", letterSpacing: "0.08em",
  textTransform: "uppercase", marginBottom: 6,
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function fmt(cents: number, currency: string) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 2,
  });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [payouts, setPayouts] = useState<ProcessedPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [bank, setBank] = useState<BankDetails>({
    accountHolderName: "",
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    accountType: "checking",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/payouts").then((r) => r.json()),
    ]).then(([p, h]: [UserProfile, ProcessedPayout[]]) => {
      setProfile(p);
      if (p.bankDetails) setBank(p.bankDetails);
      setPayouts(h);
    }).catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  async function saveBankDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankDetails: bank }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save.");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 560 }}>
        <div className="bs-skeleton" style={{ height: 28, width: 160, marginBottom: 24 }} />
        <div className="bs-skeleton" style={{ height: 220, borderRadius: 12, marginBottom: 16 }} />
        <div className="bs-skeleton" style={{ height: 300, borderRadius: 12 }} />
      </div>
    );
  }

  if (!profile) {
    return <p style={{ color: "var(--burgundy)", fontSize: 13 }}>Could not load profile.</p>;
  }

  // Filter payouts to this user's recipient name
  const myEntries = profile.recipientName
    ? payouts.flatMap((p) => p.entries
        .filter((e) => e.recipientName === profile.recipientName)
        .map((e) => ({ ...e, payoutId: p.id, period: p.period, periodLabel: p.periodLabel, processedAt: p.processedAt }))
      )
    : [];

  const totalEarned = myEntries.reduce((s, e) => s + e.amountCents, 0);
  const transferred = myEntries.filter((e) => e.transferredAt).reduce((s, e) => s + e.amountCents, 0);
  const pending = totalEarned - transferred;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="bs-heading" style={{ fontSize: 26, marginBottom: 3 }}>My Profile</h1>
        <p className="bs-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{profile.username}</p>
      </div>

      {/* Recipient link status */}
      <div className="bs-card" style={{ padding: "16px 20px", marginBottom: 20 }}>
        <p style={{ ...labelStyle, marginBottom: 8 }}>Payout Recipient</p>
        {profile.recipientName ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{profile.recipientName}</span>
            <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", padding: "2px 8px", borderRadius: 20, background: "rgba(31,77,58,0.1)", color: "var(--bs-green, #1f4d3a)", border: "1px solid rgba(31,77,58,0.2)" }}>
              Linked
            </span>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "var(--ink-3)" }}>
            Not linked to a payout split. Contact your administrator to link your account.
          </p>
        )}
      </div>

      {/* Earnings summary */}
      {profile.recipientName && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          <div className="bs-card" style={{ padding: "14px 16px" }}>
            <p style={{ ...labelStyle, marginBottom: 4 }}>Total Earned</p>
            <p className="bs-mono" style={{ fontSize: 16, fontWeight: 700 }}>{fmt(totalEarned, "usd")}</p>
          </div>
          <div className="bs-card" style={{ padding: "14px 16px" }}>
            <p style={{ ...labelStyle, marginBottom: 4 }}>Transferred</p>
            <p className="bs-mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--bs-green, #1f4d3a)" }}>{fmt(transferred, "usd")}</p>
          </div>
          <div className="bs-card" style={{ padding: "14px 16px" }}>
            <p style={{ ...labelStyle, marginBottom: 4 }}>Pending</p>
            <p className="bs-mono" style={{ fontSize: 16, fontWeight: 700, color: pending > 0 ? "var(--brass)" : "var(--ink-3)" }}>{fmt(pending, "usd")}</p>
          </div>
        </div>
      )}

      {/* Bank details form */}
      <section style={{ marginBottom: 28 }}>
        <h2 className="bs-heading" style={{ fontSize: 17, marginBottom: 14 }}>Bank Details</h2>
        <form onSubmit={saveBankDetails} className="bs-card" style={{ padding: "20px" }}>
          <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 16 }}>
            Your bank details are stored securely and used by the administrator to process your transfers.
          </p>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={labelStyle}>Account Holder Name</label>
              <input value={bank.accountHolderName} onChange={(e) => setBank((b) => ({ ...b, accountHolderName: e.target.value }))} style={inputStyle} placeholder="Full legal name" required />
            </div>
            <div>
              <label style={labelStyle}>Bank Name</label>
              <input value={bank.bankName} onChange={(e) => setBank((b) => ({ ...b, bankName: e.target.value }))} style={inputStyle} placeholder="e.g. Chase, Wells Fargo" required />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Routing Number</label>
                <input value={bank.routingNumber} onChange={(e) => setBank((b) => ({ ...b, routingNumber: e.target.value }))} style={inputStyle} placeholder="9 digits" maxLength={9} required />
              </div>
              <div>
                <label style={labelStyle}>Account Number</label>
                <input value={bank.accountNumber} onChange={(e) => setBank((b) => ({ ...b, accountNumber: e.target.value }))} style={inputStyle} placeholder="Account number" required />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Account Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["checking", "savings"] as const).map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => setBank((b) => ({ ...b, accountType: t }))}
                    style={{
                      padding: "6px 16px", borderRadius: 7, fontSize: 12,
                      fontFamily: "var(--font-dm-mono, monospace)", cursor: "pointer",
                      border: bank.accountType === t ? "none" : "1px solid var(--rule)",
                      background: bank.accountType === t ? "var(--ink)" : "var(--paper)",
                      color: bank.accountType === t ? "var(--brass)" : "var(--ink-3)",
                    }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)", borderRadius: 8, padding: "10px 14px", marginTop: 14, fontSize: 12, color: "var(--burgundy)" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
            <button type="submit" disabled={saving} style={{
              fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
              padding: "9px 20px", borderRadius: 8, border: "none",
              background: "var(--ink)", color: "var(--brass)", cursor: "pointer",
              opacity: saving ? 0.6 : 1,
            }}>
              {saving ? "Saving…" : "Save Bank Details"}
            </button>
            {saved && <span style={{ fontSize: 12, color: "var(--bs-green, #1f4d3a)", fontFamily: "var(--font-dm-mono, monospace)" }}>Saved ✓</span>}
          </div>
        </form>
      </section>

      {/* Earnings history */}
      {profile.recipientName && (
        <section>
          <h2 className="bs-heading" style={{ fontSize: 17, marginBottom: 14 }}>Earnings History</h2>
          {myEntries.length === 0 ? (
            <div style={{ border: "1px dashed var(--rule)", borderRadius: 10, padding: "28px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              No payouts recorded yet.
            </div>
          ) : (
            <div className="bs-card" style={{ overflow: "hidden" }}>
              <table className="bs-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Club</th>
                    <th style={{ textAlign: "right" }}>Split</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th style={{ textAlign: "right" }}>Status</th>
                    <th style={{ textAlign: "right" }}>Statement</th>
                  </tr>
                </thead>
                <tbody>
                  {myEntries.map((e, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 13, fontWeight: 600 }}>{e.periodLabel}</td>
                      <td style={{ fontSize: 12 }}>{e.clubCity}</td>
                      <td className="bs-mono" style={{ textAlign: "right", fontSize: 12, color: "var(--ink-3)" }}>{e.pct}%</td>
                      <td className="bs-mono" style={{ textAlign: "right", fontSize: 13, fontWeight: 700 }}>{fmt(e.amountCents, e.currency)}</td>
                      <td style={{ textAlign: "right" }}>
                        {e.transferredAt ? (
                          <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", padding: "2px 8px", borderRadius: 20, background: "rgba(31,77,58,0.1)", color: "var(--bs-green, #1f4d3a)", border: "1px solid rgba(31,77,58,0.2)" }}>
                            Transferred
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", padding: "2px 8px", borderRadius: 20, background: "rgba(184,144,66,0.1)", color: "var(--brass)", border: "1px solid rgba(184,144,66,0.2)" }}>
                            Pending
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/payouts/${e.payoutId}/statement?recipient=${encodeURIComponent(profile.recipientName!)}`}
                          target="_blank"
                          style={{ fontSize: 11, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--brass)", textDecoration: "none" }}
                        >
                          View ↗
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
