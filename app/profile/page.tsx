"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { BankDetails } from "@/lib/users-store";
import { SUPPORTED_CURRENCIES } from "@/lib/fx-rates";
import type { ProcessedPayout } from "@/lib/payout-store";
import type { ClubSplit, SplitRecipient } from "@/lib/splits-store";

interface UserProfile {
  id: string;
  username: string;
  role: string;
  recipientName?: string;
  bankDetails?: BankDetails;
  clubSlugs: string[];
  email?: string;
  preferredCurrency?: string;
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
  const [splits, setSplits] = useState<ClubSplit[]>([]);
  const [clubs, setClubs] = useState<{ slug: string; city: string; flag: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [splitSaving, setSplitSaving] = useState<string>("");
  const [splitSaved, setSplitSaved] = useState<string>("");
  const [users, setUsers] = useState<{ id: string; username: string; recipientName?: string }[]>([]);

  const [bank, setBank] = useState<BankDetails>({
    accountHolderName: "",
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    accountType: "checking",
  });
  const [email, setEmail] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState("");
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/payouts").then((r) => r.json()),
      fetch("/api/admin/splits").then((r) => r.json()),
      fetch("/api/admin/clubs").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.ok ? r.json() : []),
    ]).then(([p, h, s, c, u]: [UserProfile, ProcessedPayout[], ClubSplit[], { slug: string; city: string; flag: string }[], { id: string; username: string; recipientName?: string }[]]) => {
      setProfile(p);
      if (p.bankDetails) setBank(p.bankDetails);
      if (p.email) setEmail(p.email);
      if (p.preferredCurrency) setPreferredCurrency(p.preferredCurrency);
      setPayouts(h);
      setSplits(s);
      setClubs(c);
      setUsers(Array.isArray(u) ? u : []);
    }).catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  async function saveSplit(clubSlug: string, recipients: SplitRecipient[]) {
    setSplitSaving(clubSlug);
    setSplitSaved("");
    const res = await fetch("/api/admin/splits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubSlug, recipients }),
    });
    if (res.ok) {
      const updated: ClubSplit = await res.json();
      setSplits((prev) => prev.map((s) => s.clubSlug === clubSlug ? updated : s));
      setSplitSaved(clubSlug);
      setTimeout(() => setSplitSaved(""), 3000);
    }
    setSplitSaving("");
  }

  function updateSplitPct(clubSlug: string, recipientName: string, pct: number) {
    setSplits((prev) => prev.map((s) =>
      s.clubSlug !== clubSlug ? s : {
        ...s,
        recipients: s.recipients.map((r) => r.name === recipientName ? { ...r, pct } : r),
      }
    ));
  }

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

  async function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    setPrefSaving(true);
    setPrefSaved(false);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email || null,
        preferredCurrency: preferredCurrency || null,
      }),
    });
    if (res.ok) {
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 3000);
    }
    setPrefSaving(false);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (pwForm.next.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("Passwords don't match."); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error ?? "Failed to update password."); return; }
      setPwSaved(true);
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwSaved(false), 3000);
    } finally {
      setPwSaving(false);
    }
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

      {/* Change Password */}
      <section style={{ marginBottom: 24 }}>
        <h2 className="bs-heading" style={{ fontSize: 17, marginBottom: 14 }}>Change Password</h2>
        <form onSubmit={changePassword} className="bs-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Current Password</label>
            <input
              type="password" value={pwForm.current} required
              onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
              style={inputStyle} autoComplete="current-password"
            />
          </div>
          <div>
            <label style={labelStyle}>New Password</label>
            <input
              type="password" value={pwForm.next} required minLength={8}
              onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
              style={inputStyle} autoComplete="new-password" placeholder="Min. 8 characters"
            />
          </div>
          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input
              type="password" value={pwForm.confirm} required
              onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
              style={inputStyle} autoComplete="new-password"
            />
          </div>
          {pwError && (
            <div style={{ background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--burgundy)" }}>
              {pwError}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="submit" disabled={pwSaving} style={{
              fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
              padding: "9px 20px", borderRadius: 8, border: "none",
              background: "var(--ink)", color: "var(--brass)", cursor: "pointer",
              opacity: pwSaving ? 0.6 : 1,
            }}>
              {pwSaving ? "Saving…" : "Update Password"}
            </button>
            {pwSaved && <span style={{ fontSize: 12, color: "var(--bs-green, #1f4d3a)", fontFamily: "var(--font-dm-mono, monospace)" }}>Password updated ✓</span>}
          </div>
        </form>
      </section>

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

      {/* Preferred payment currency — club admins only */}
      {profile.role !== "super_admin" && (
        <section style={{ marginBottom: 28 }}>
          <h2 className="bs-heading" style={{ fontSize: 17, marginBottom: 14 }}>Payment Preferences</h2>
          <form onSubmit={savePreferences} className="bs-card" style={{ padding: "20px" }}>
            <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 16 }}>
              Your preferred currency is shown alongside your split payout on each club page,
              so payouts can be sent in the currency that suits you best.
            </p>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle} placeholder="you@example.com"
                />
              </div>
              <div>
                <label style={labelStyle}>Preferred Payment Currency</label>
                <select
                  value={preferredCurrency}
                  onChange={(e) => setPreferredCurrency(e.target.value)}
                  style={{ ...inputStyle, appearance: "none" }}
                >
                  <option value="">— not set —</option>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
                {preferredCurrency && (
                  <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 5, fontFamily: "var(--font-dm-mono, monospace)" }}>
                    Your payout amounts will be shown in {preferredCurrency.toUpperCase()} on club pages.
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
              <button type="submit" disabled={prefSaving} style={{
                fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
                padding: "9px 20px", borderRadius: 8, border: "none",
                background: "var(--ink)", color: "var(--brass)", cursor: "pointer",
                opacity: prefSaving ? 0.6 : 1,
              }}>
                {prefSaving ? "Saving…" : "Save Preferences"}
              </button>
              {prefSaved && <span style={{ fontSize: 12, color: "var(--bs-green, #1f4d3a)", fontFamily: "var(--font-dm-mono, monospace)" }}>Saved ✓</span>}
            </div>
          </form>
        </section>
      )}

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

      {/* Bank details form — club admins only (super admin is a virtual account) */}
      {profile.role !== "super_admin" && <section style={{ marginBottom: 28 }}>
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
      </section>}

      {/* Revenue splits — editable by super admin */}
      {profile.role === "super_admin" && (
        <section style={{ marginBottom: 28 }}>
          <h2 className="bs-heading" style={{ fontSize: 17, marginBottom: 6 }}>Revenue Splits</h2>
          <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 14 }}>
            Adjust the percentage each recipient receives per club. Changes take effect immediately.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {clubs.map((club) => {
              const split = splits.find((s) => s.clubSlug === club.slug);
              if (!split) return null;
              const total = split.recipients.reduce((s, r) => s + (r.pct || 0), 0);
              const valid = Math.round(total) === 100;
              return (
                <div key={club.slug} className="bs-card" style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{club.flag}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{club.city}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", padding: "2px 8px", borderRadius: 20, background: valid ? "rgba(31,77,58,0.1)" : "rgba(139,26,26,0.1)", color: valid ? "var(--bs-green, #1f4d3a)" : "var(--burgundy)", border: `1px solid ${valid ? "rgba(31,77,58,0.2)" : "rgba(139,26,26,0.2)"}` }}>
                        {total}% / 100%
                      </span>
                      {splitSaved === club.slug && <span style={{ fontSize: 11, color: "var(--bs-green, #1f4d3a)", fontFamily: "var(--font-dm-mono, monospace)" }}>Saved ✓</span>}
                      <button
                        onClick={() => saveSplit(club.slug, split.recipients)}
                        disabled={!valid || splitSaving === club.slug}
                        style={{ fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11, padding: "4px 14px", borderRadius: 7, border: "none", background: valid ? "var(--ink)" : "var(--rule)", color: valid ? "var(--brass)" : "var(--ink-3)", cursor: valid && !splitSaving ? "pointer" : "not-allowed", opacity: splitSaving === club.slug ? 0.6 : 1 }}
                      >
                        {splitSaving === club.slug ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {split.recipients.map((r) => {
                      const linkedUser = users.find((u) => u.recipientName === r.name && u.clubSlugs.includes(club.slug));
                      return (
                        <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 13, color: "var(--ink)" }}>{r.name}</span>
                            {linkedUser && (
                              <span className="bs-mono" style={{ fontSize: 9, color: "var(--ink-3)", marginLeft: 8, letterSpacing: "0.06em" }}>
                                @{linkedUser.username}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <input
                              type="number" min={0} max={100}
                              value={r.pct}
                              onChange={(e) => updateSplitPct(club.slug, r.name, Number(e.target.value))}
                              style={{ width: 56, padding: "4px 8px", borderRadius: 7, border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontSize: 12, fontFamily: "var(--font-dm-mono, monospace)", textAlign: "center", outline: "none" }}
                            />
                            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
