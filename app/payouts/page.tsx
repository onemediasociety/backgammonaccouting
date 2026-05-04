"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { ProcessedPayout, PayoutEntry } from "@/lib/payout-store";
import type { ClubSplit } from "@/lib/splits-store";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmt(cents: number, currency: string) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 2,
  });
}

interface UserProfile {
  id: string;
  username: string;
  role: string;
  recipientName?: string;
}

interface CashEvent {
  id: string;
  date: string;
  event: string;
  playerCount: number;
  buyInAmount: number;
  totalAmount: number;
}

interface ExpensePayer {
  payer: string;
  cents: number;
}

interface ClubBreakdown {
  slug: string;
  city: string;
  flag: string;
  currency: string;
  stripeCents: number;
  cashCents: number;
  feeCents: number;
  expenseCents: number;
  netCents: number;
  cashEvents: CashEvent[];
  expensesByPayer: ExpensePayer[];
}

// ── Club Admin: own earnings view ────────────────────────────────────────────
function MyEarningsView({ profile, payouts }: { profile: UserProfile; payouts: ProcessedPayout[] }) {
  if (!profile.recipientName) {
    return (
      <div style={{ border: "1px dashed var(--rule)", borderRadius: 10, padding: "36px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
        Your account isn&apos;t linked to a payout recipient yet. Contact your administrator.
      </div>
    );
  }

  const myEntries = payouts.flatMap((p) =>
    p.entries
      .filter((e) => e.recipientName === profile.recipientName)
      .map((e) => ({ ...e, payoutId: p.id, periodLabel: p.periodLabel, processedAt: p.processedAt }))
  );

  const totalEarned = myEntries.reduce((s, e) => s + e.amountCents, 0);
  const transferred = myEntries.filter((e) => e.transferredAt).reduce((s, e) => s + e.amountCents, 0);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>{profile.recipientName}</p>
        <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em" }}>{profile.username}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
        <div className="bs-card" style={{ padding: "16px 20px" }}>
          <p className="bs-label" style={{ marginBottom: 5 }}>Total Earned</p>
          <p className="bs-mono" style={{ fontSize: 20, fontWeight: 700 }}>{fmt(totalEarned, "usd")}</p>
        </div>
        <div className="bs-card" style={{ padding: "16px 20px" }}>
          <p className="bs-label" style={{ marginBottom: 5 }}>Transferred</p>
          <p className="bs-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--bs-green, #1f4d3a)" }}>{fmt(transferred, "usd")}</p>
        </div>
        <div className="bs-card" style={{ padding: "16px 20px" }}>
          <p className="bs-label" style={{ marginBottom: 5 }}>Pending</p>
          <p className="bs-mono" style={{ fontSize: 20, fontWeight: 700, color: totalEarned - transferred > 0 ? "var(--brass)" : "var(--ink-3)" }}>{fmt(totalEarned - transferred, "usd")}</p>
        </div>
      </div>

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
                <th style={{ textAlign: "right" }}>Net Revenue</th>
                <th style={{ textAlign: "right" }}>Your Split</th>
                <th style={{ textAlign: "right" }}>Your Earnings</th>
                <th style={{ textAlign: "right" }}>Status</th>
                <th style={{ textAlign: "right" }}>Statement</th>
              </tr>
            </thead>
            <tbody>
              {myEntries.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 13, fontWeight: 600 }}>{e.periodLabel}</td>
                  <td style={{ fontSize: 12 }}>{e.clubCity}</td>
                  <td className="bs-mono" style={{ textAlign: "right", fontSize: 12, color: "var(--ink-3)" }}>{fmt(e.netCents, e.currency)}</td>
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
    </div>
  );
}

// ── Super Admin: full management view ─────────────────────────────────────────
interface AdminUser { id: string; username: string; recipientName?: string; }

function SuperAdminView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [clubs, setClubs] = useState<ClubBreakdown[]>([]);
  const [splits, setSplits] = useState<ClubSplit[]>([]);
  const [history, setHistory] = useState<ProcessedPayout[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [transferring, setTransferring] = useState<string>("");
  const [selectedClub, setSelectedClub] = useState<string>("all");

  useEffect(() => {
    fetch("/api/payouts").then((r) => r.json()).then(setHistory).catch(() => {});
    fetch("/api/admin/splits").then((r) => r.json()).then(setSplits).catch(() => {});
    fetch("/api/admin/users").then((r) => r.ok ? r.json() : []).then((u) => setUsers(Array.isArray(u) ? u : [])).catch(() => {});
  }, []);

  const calculate = useCallback(async () => {
    setLoadingCalc(true);
    setError("");
    setSuccess("");
    try {
      const from = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const to = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

      const [paymentsRes, cashRes, feesRes, clubsRes, expensesRes] = await Promise.all([
        fetch(`/api/stripe?from=${from}&to=${to}`),
        fetch(`/api/cash?from=${from}&to=${to}`),
        fetch(`/api/stripe/fees?from=${from}&to=${to}`),
        fetch("/api/admin/clubs"),
        fetch(`/api/expenses?from=${from}&to=${to}`),
      ]);

      const payments: { clubSlug: string; amount: number; currency: string; status: string }[] =
        paymentsRes.ok ? await paymentsRes.json() : [];
      const cashEntries: { id: string; clubSlug: string; date: string; event: string; playerCount: number; buyInAmount: number; totalAmount: number; currency: string }[] =
        cashRes.ok ? await cashRes.json() : [];
      const fees: Record<string, number> = feesRes.ok ? await feesRes.json() : {};
      const clubList: { slug: string; city: string; flag: string; currency: string }[] =
        clubsRes.ok ? await clubsRes.json() : [];
      const expensesList: { clubSlug: string; amountCents: number; paidBy?: string }[] =
        expensesRes.ok ? await expensesRes.json() : [];

      const stripeByClub: Record<string, number> = {};
      for (const p of payments) {
        if (p.status !== "succeeded") continue;
        stripeByClub[p.clubSlug] = (stripeByClub[p.clubSlug] ?? 0) + p.amount;
      }

      const cashByClub: Record<string, { cents: number; events: CashEvent[] }> = {};
      for (const c of cashEntries) {
        if (!cashByClub[c.clubSlug]) cashByClub[c.clubSlug] = { cents: 0, events: [] };
        cashByClub[c.clubSlug].cents += c.totalAmount;
        cashByClub[c.clubSlug].events.push({ id: c.id, date: c.date, event: c.event, playerCount: c.playerCount, buyInAmount: c.buyInAmount, totalAmount: c.totalAmount });
      }

      const expensesByClub: Record<string, number> = {};
      const expensesPayerByClub: Record<string, Record<string, number>> = {};
      for (const e of expensesList) {
        expensesByClub[e.clubSlug] = (expensesByClub[e.clubSlug] ?? 0) + e.amountCents;
        if (!expensesPayerByClub[e.clubSlug]) expensesPayerByClub[e.clubSlug] = {};
        const payer = e.paidBy?.trim() || "Unknown";
        expensesPayerByClub[e.clubSlug][payer] = (expensesPayerByClub[e.clubSlug][payer] ?? 0) + e.amountCents;
      }

      const breakdowns: ClubBreakdown[] = clubList.map((c) => {
        const stripeCents = stripeByClub[c.slug] ?? 0;
        const cashCents = cashByClub[c.slug]?.cents ?? 0;
        const feeCents = fees[c.slug] ?? 0;
        const expenseCents = expensesByClub[c.slug] ?? 0;
        const cashEvents = (cashByClub[c.slug]?.events ?? []).sort((a, b) => a.date.localeCompare(b.date));
        const expensesByPayer = Object.entries(expensesPayerByClub[c.slug] ?? {})
          .map(([payer, cents]) => ({ payer, cents }))
          .sort((a, b) => b.cents - a.cents);
        return { slug: c.slug, city: c.city, flag: c.flag, currency: c.currency, stripeCents, cashCents, feeCents, expenseCents, netCents: (stripeCents - feeCents) + cashCents - expenseCents, cashEvents, expensesByPayer };
      }).filter((c) => c.stripeCents > 0 || c.cashCents > 0);

      setClubs(breakdowns);
      setSelectedClub("all");
    } catch {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoadingCalc(false);
    }
  }, [year, month]);

  const allEntries: PayoutEntry[] = [];
  for (const club of clubs) {
    const split = splits.find((s) => s.clubSlug === club.slug);
    if (!split) continue;
    for (const r of split.recipients) {
      allEntries.push({
        clubSlug: club.slug, clubCity: club.city, currency: club.currency,
        recipientName: r.name, recipientEmail: r.email, pct: r.pct,
        netCents: club.netCents, amountCents: Math.round(club.netCents * r.pct / 100),
      });
    }
  }

  const byRecipient: Record<string, { cents: number; cities: string[] }> = {};
  for (const e of allEntries) {
    if (e.currency === "usd") {
      if (!byRecipient[e.recipientName]) byRecipient[e.recipientName] = { cents: 0, cities: [] };
      byRecipient[e.recipientName].cents += e.amountCents;
      if (!byRecipient[e.recipientName].cities.includes(e.clubCity)) {
        byRecipient[e.recipientName].cities.push(e.clubCity);
      }
    }
  }

  async function processPayout() {
    if (allEntries.length === 0) return;
    setProcessing(true);
    setError(""); setSuccess("");
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const periodLabel = `${MONTHS[month - 1]} ${year}`;
    const res = await fetch("/api/payouts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period, periodLabel, entries: allEntries }),
    });
    if (res.ok) {
      const payout = await res.json();
      setHistory((prev) => [payout, ...prev]);
      setSuccess(`Payout for ${periodLabel} recorded.`);
      setClubs([]);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to record payout.");
    }
    setProcessing(false);
  }

  async function markTransferred(payoutId: string, recipientName: string) {
    const key = `${payoutId}:${recipientName}`;
    setTransferring(key);
    const note = prompt(`Transfer note for ${recipientName} (optional):`) ?? "";
    const res = await fetch(`/api/payouts/${payoutId}/transfer`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientName, note }),
    });
    if (res.ok) {
      const updated: ProcessedPayout = await res.json();
      setHistory((prev) => prev.map((p) => p.id === payoutId ? updated : p));
    }
    setTransferring("");
  }

  const period = `${year}-${String(month).padStart(2, "0")}`;
  const alreadyProcessed = history.some((h) => h.period === period);

  return (
    <div>
      {/* Calculator */}
      <section style={{ marginBottom: 32 }}>
        <h2 className="bs-heading" style={{ fontSize: 18, marginBottom: 14 }}>Calculate Monthly Payout</h2>
        <div className="bs-card" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Month</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontSize: 13, fontFamily: "var(--font-dm-mono, monospace)", cursor: "pointer" }}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>Year</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--rule)", background: "var(--paper)", color: "var(--ink)", fontSize: 13, fontFamily: "var(--font-dm-mono, monospace)", cursor: "pointer" }}>
                {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={calculate} disabled={loadingCalc} style={{ fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12, padding: "8px 20px", borderRadius: 8, border: "none", background: "var(--ink)", color: "var(--brass)", cursor: loadingCalc ? "wait" : "pointer", opacity: loadingCalc ? 0.6 : 1 }}>
              {loadingCalc ? "Calculating…" : "Calculate"}
            </button>
            {alreadyProcessed && !loadingCalc && (
              <span style={{ fontSize: 11, color: "var(--brass)", fontFamily: "var(--font-dm-mono, monospace)" }}>⚠ Already processed for this period</span>
            )}
          </div>

          {error && <div style={{ background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--burgundy)" }}>{error}</div>}
          {success && <div style={{ background: "rgba(31,77,58,0.07)", border: "1px solid rgba(31,77,58,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--bs-green, #1f4d3a)" }}>{success}</div>}

          {clubs.length > 0 && (
            <>
              {/* Recipient summary */}
              <div style={{ marginBottom: 24 }}>
                <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Total Payouts · {MONTHS[month - 1]} {year}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                  {Object.entries(byRecipient).map(([name, { cents, cities }]) => (
                    <div key={name} className="bs-card" style={{ padding: "14px 16px" }}>
                      <p style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--font-dm-mono, monospace)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>{name}</p>
                      <p style={{ fontSize: 9, color: "var(--ink-3)", fontFamily: "var(--font-dm-mono, monospace)", marginBottom: 6 }}>{cities.join(" · ")}</p>
                      <p className="bs-mono" style={{ fontSize: 20, fontWeight: 700 }}>{fmt(cents, "usd")}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* City filter */}
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Filter by City:</p>
                {[{ slug: "all", label: "All Cities" }, ...clubs.map((c) => ({ slug: c.slug, label: `${c.flag} ${c.city}` }))].map((opt) => (
                  <button
                    key={opt.slug}
                    onClick={() => setSelectedClub(opt.slug)}
                    style={{
                      fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
                      padding: "4px 12px", borderRadius: 20, cursor: "pointer",
                      border: selectedClub === opt.slug ? "none" : "1px solid var(--rule)",
                      background: selectedClub === opt.slug ? "var(--ink)" : "transparent",
                      color: selectedClub === opt.slug ? "var(--brass)" : "var(--ink-3)",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Per-club breakdown */}
              <div style={{ marginBottom: 24 }}>
                <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Breakdown by Club</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {clubs.filter((c) => selectedClub === "all" || c.slug === selectedClub).map((club) => {
                    const split = splits.find((s) => s.clubSlug === club.slug);
                    const clubEntries = allEntries.filter((e) => e.clubSlug === club.slug);
                    return (
                      <div key={club.slug} className="bs-card" style={{ padding: "18px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 22 }}>{club.flag}</span>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 1 }}>{club.city}</p>
                              <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{club.currency.toUpperCase()}</p>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            <Stat label="Stripe" value={fmt(club.stripeCents, club.currency)} />
                            <Stat label="Cash Buy-ins" value={fmt(club.cashCents, club.currency)} />
                            {club.feeCents > 0 && <Stat label="Stripe Fees" value={`(${fmt(club.feeCents, club.currency)})`} muted />}
                            {club.expenseCents > 0 && <Stat label="Expenses" value={`(${fmt(club.expenseCents, club.currency)})`} muted />}
                            <Stat label="Net" value={fmt(club.netCents, club.currency)} bold />
                          </div>
                        </div>

                        {/* Cash events per event */}
                        {club.cashEvents.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <p style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Cash Buy-in Events</p>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr>
                                  {["Date","Event","Players","Buy-in","Total"].map((h, i) => (
                                    <th key={h} style={{ textAlign: i < 2 ? "left" : "right", padding: "4px 8px", fontFamily: "var(--font-dm-mono, monospace)", fontSize: 9, color: "var(--ink-3)", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid var(--rule)" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {club.cashEvents.map((ev) => (
                                  <tr key={ev.id}>
                                    <td className="bs-mono" style={{ padding: "6px 8px", fontSize: 11, color: "var(--ink-3)", borderBottom: "1px solid var(--rule)" }}>{ev.date}</td>
                                    <td style={{ padding: "6px 8px", color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}>{ev.event}</td>
                                    <td className="bs-mono" style={{ padding: "6px 8px", textAlign: "right", color: "var(--ink-3)", borderBottom: "1px solid var(--rule)" }}>{ev.playerCount}</td>
                                    <td className="bs-mono" style={{ padding: "6px 8px", textAlign: "right", color: "var(--ink-3)", borderBottom: "1px solid var(--rule)" }}>{fmt(ev.buyInAmount, club.currency)}</td>
                                    <td className="bs-mono" style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}>{fmt(ev.totalAmount, club.currency)}</td>
                                  </tr>
                                ))}
                                <tr>
                                  <td colSpan={4} style={{ padding: "6px 8px", fontFamily: "var(--font-dm-mono, monospace)", fontSize: 10, color: "var(--ink-3)", borderTop: "2px solid var(--rule)" }}>Total Cash</td>
                                  <td className="bs-mono" style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "var(--ink)", borderTop: "2px solid var(--rule)" }}>{fmt(club.cashCents, club.currency)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Split table */}
                        {split && clubEntries.length > 0 ? (
                          <>
                            <p style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Revenue Split</p>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr>
                                  {["Recipient","Split","Payout"].map((h, i) => (
                                    <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "5px 10px", fontFamily: "var(--font-dm-mono, monospace)", fontSize: 10, color: "var(--ink-3)", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid var(--rule)" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {clubEntries.map((e, i) => {
                                  const linkedUser = users.find((u) => u.recipientName === e.recipientName);
                                  return (
                                    <tr key={i}>
                                      <td style={{ padding: "7px 10px", color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}>
                                        <span>{e.recipientName}</span>
                                        {linkedUser && (
                                          <span className="bs-mono" style={{ fontSize: 9, color: "var(--ink-3)", marginLeft: 8, letterSpacing: "0.06em" }}>
                                            @{linkedUser.username}
                                          </span>
                                        )}
                                      </td>
                                      <td className="bs-mono" style={{ padding: "7px 10px", textAlign: "right", color: "var(--ink-3)", borderBottom: "1px solid var(--rule)" }}>{e.pct}%</td>
                                      <td className="bs-mono" style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}>{fmt(e.amountCents, e.currency)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </>
                        ) : (
                          <p style={{ fontSize: 11, color: "var(--ink-3)", fontStyle: "italic" }}>No split configured for this club.</p>
                        )}

                        {/* Expenses breakdown by payer */}
                        {club.expensesByPayer.length > 0 && (
                          <div style={{ marginTop: 16 }}>
                            <p style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Expenses by Payer</p>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr>
                                  {["Paid By","Total Expenses"].map((h, i) => (
                                    <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "5px 10px", fontFamily: "var(--font-dm-mono, monospace)", fontSize: 10, color: "var(--ink-3)", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid var(--rule)" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {club.expensesByPayer.map(({ payer, cents }) => (
                                  <tr key={payer}>
                                    <td style={{ padding: "7px 10px", color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}>{payer}</td>
                                    <td className="bs-mono" style={{ padding: "7px 10px", textAlign: "right", color: "var(--burgundy)", fontWeight: 600, borderBottom: "1px solid var(--rule)" }}>({fmt(cents, club.currency)})</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Settlement */}
                        {split && clubEntries.length > 0 && (() => {
                          const globalEntry = clubEntries[0];
                          const cityEntries = clubEntries.slice(1);
                          if (cityEntries.length === 0) return null;

                          const cityOwed = cityEntries.reduce((s, e) => s + e.amountCents, 0);
                          const cityHasCash = club.cashCents;
                          const netToCity = cityOwed - cityHasCash;
                          // Distribute cash proportionally among city recipients by their pct
                          const cityTotalPct = cityEntries.reduce((s, e) => s + e.pct, 0);

                          return (
                            <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 10, background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                              <p style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Settlement · Who Pays Whom</p>
                              <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 12 }}>
                                Cash buy-ins ({fmt(cityHasCash, club.currency)}) were collected at the event and are already with the city admins.
                              </p>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                  <tr>
                                    {["Person","Split","Owed","Cash Held","Net Wire"].map((h, i) => (
                                      <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "5px 10px", fontFamily: "var(--font-dm-mono, monospace)", fontSize: 10, color: "var(--ink-3)", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid var(--rule)" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* Global row */}
                                  <tr>
                                    <td style={{ padding: "7px 10px", color: "var(--ink)", borderBottom: "1px solid var(--rule)" }}>
                                      {globalEntry.recipientName}
                                      <span className="bs-mono" style={{ fontSize: 9, color: "var(--ink-3)", marginLeft: 6 }}>global</span>
                                    </td>
                                    <td className="bs-mono" style={{ padding: "7px 10px", textAlign: "right", color: "var(--ink-3)", borderBottom: "1px solid var(--rule)" }}>{globalEntry.pct}%</td>
                                    <td className="bs-mono" style={{ padding: "7px 10px", textAlign: "right", color: "var(--ink-3)", borderBottom: "1px solid var(--rule)" }}>{fmt(globalEntry.amountCents, club.currency)}</td>
                                    <td className="bs-mono" style={{ padding: "7px 10px", textAlign: "right", color: "var(--ink-3)", borderBottom: "1px solid var(--rule)" }}>— (Stripe)</td>
                                    <td className="bs-mono" style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "var(--bs-green, #1f4d3a)", borderBottom: "1px solid var(--rule)" }}>
                                      Keep {fmt(globalEntry.amountCents, club.currency)}
                                    </td>
                                  </tr>
                                  {/* One row per city recipient */}
                                  {cityEntries.map((ce, ci) => {
                                    const proportionalCash = cityTotalPct > 0
                                      ? Math.round(cityHasCash * ce.pct / cityTotalPct)
                                      : 0;
                                    const net = ce.amountCents - proportionalCash;
                                    const isLast = ci === cityEntries.length - 1;
                                    const flatFee = split.recipients.find((r) => r.name === ce.recipientName)?.flatFeeCents ?? 0;
                                    const totalOwed = ce.amountCents + flatFee;
                                    return (
                                      <tr key={ce.recipientName}>
                                        <td style={{ padding: "7px 10px", color: "var(--ink)", borderBottom: isLast ? "none" : "1px solid var(--rule)" }}>
                                          {ce.recipientName}
                                          <span className="bs-mono" style={{ fontSize: 9, color: "var(--ink-3)", marginLeft: 6 }}>city</span>
                                        </td>
                                        <td className="bs-mono" style={{ padding: "7px 10px", textAlign: "right", color: "var(--ink-3)", borderBottom: isLast ? "none" : "1px solid var(--rule)" }}>{ce.pct}%</td>
                                        <td style={{ padding: "7px 10px", textAlign: "right", borderBottom: isLast ? "none" : "1px solid var(--rule)" }}>
                                          <span className="bs-mono" style={{ color: "var(--ink-3)" }}>{fmt(totalOwed, club.currency)}</span>
                                          {flatFee > 0 && (
                                            <div className="bs-mono" style={{ fontSize: 9, color: "var(--ink-3)", marginTop: 2 }}>
                                              {fmt(ce.amountCents, club.currency)} split + {fmt(flatFee, club.currency)} flat fee
                                            </div>
                                          )}
                                        </td>
                                        <td className="bs-mono" style={{ padding: "7px 10px", textAlign: "right", color: "var(--ink-3)", borderBottom: isLast ? "none" : "1px solid var(--rule)" }}>{fmt(proportionalCash, club.currency)} cash</td>
                                        <td className="bs-mono" style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: net >= 0 ? "var(--bs-green, #1f4d3a)" : "var(--burgundy)", borderBottom: isLast ? "none" : "1px solid var(--rule)" }}>
                                          {net >= 0 ? `Receive ${fmt(net, club.currency)}` : `Pay back ${fmt(-net, club.currency)}`}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--rule)", fontSize: 11, color: netToCity >= 0 ? "var(--ink-3)" : "var(--burgundy)" }}>
                                {netToCity >= 0
                                  ? <>→ Global sends <strong>{fmt(netToCity, club.currency)}</strong> total to city from Stripe proceeds.</>
                                  : <>→ City admins send <strong>{fmt(-netToCity, club.currency)}</strong> total to global (cash collected exceeds city&apos;s split).</>}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={processPayout} disabled={processing || alreadyProcessed}
                style={{ fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12, padding: "10px 24px", borderRadius: 8, border: "none", background: alreadyProcessed ? "var(--rule)" : "var(--bs-green, #1f4d3a)", color: alreadyProcessed ? "var(--ink-3)" : "#fff", cursor: processing || alreadyProcessed ? "not-allowed" : "pointer", opacity: processing ? 0.6 : 1, fontWeight: 500 }}
              >
                {processing ? "Recording…" : alreadyProcessed ? "Already Processed" : `Record Payout · ${MONTHS[month - 1]} ${year}`}
              </button>
            </>
          )}
        </div>
      </section>

      {/* History with transfer controls */}
      <section>
        <h2 className="bs-heading" style={{ fontSize: 18, marginBottom: 14 }}>Payout History</h2>
        {history.length === 0 ? (
          <div style={{ border: "1px dashed var(--rule)", borderRadius: 10, padding: "32px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No payouts recorded yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {history.map((p) => {
              const recipients = [...new Set(p.entries.map((e) => e.recipientName))];
              const byRecip: Record<string, { entries: typeof p.entries; transferred: boolean }> = {};
              for (const r of recipients) {
                const rEntries = p.entries.filter((e) => e.recipientName === r);
                byRecip[r] = { entries: rEntries, transferred: rEntries.every((e) => e.transferredAt) };
              }
              return (
                <div key={p.id} className="bs-card" style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>{p.periodLabel}</p>
                      <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                        Processed {new Date(p.processedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} by {p.processedBy}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {recipients.map((name) => {
                      const { entries: rEntries, transferred } = byRecip[name];
                      const total = rEntries.reduce((s, e) => s + e.amountCents, 0);
                      const currency = rEntries[0]?.currency ?? "usd";
                      const key = `${p.id}:${name}`;
                      return (
                        <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "var(--paper-2)", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{name}</span>
                              {(() => { const u = users.find((u) => u.recipientName === name); return u ? <span className="bs-mono" style={{ fontSize: 9, color: "var(--ink-3)", marginLeft: 8, letterSpacing: "0.06em" }}>@{u.username}</span> : null; })()}
                            </div>
                            <span className="bs-mono" style={{ fontSize: 13, color: "var(--ink)" }}>{fmt(total, currency)}</span>
                            {transferred ? (
                              <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", padding: "2px 8px", borderRadius: 20, background: "rgba(31,77,58,0.1)", color: "var(--bs-green, #1f4d3a)", border: "1px solid rgba(31,77,58,0.2)" }}>Transferred ✓</span>
                            ) : (
                              <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)", padding: "2px 8px", borderRadius: 20, background: "rgba(184,144,66,0.1)", color: "var(--brass)", border: "1px solid rgba(184,144,66,0.2)" }}>Pending</span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <Link
                              href={`/payouts/${p.id}/statement?recipient=${encodeURIComponent(name)}`}
                              target="_blank"
                              style={{ fontSize: 11, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--brass)", textDecoration: "none", padding: "4px 10px", border: "1px solid rgba(184,144,66,0.3)", borderRadius: 6 }}
                            >
                              Statement ↗
                            </Link>
                            {!transferred && (
                              <button
                                onClick={() => markTransferred(p.id, name)}
                                disabled={transferring === key}
                                style={{ fontSize: 11, fontFamily: "var(--font-dm-mono, monospace)", padding: "4px 10px", borderRadius: 6, border: "none", background: "var(--bs-green, #1f4d3a)", color: "#fff", cursor: "pointer", opacity: transferring === key ? 0.6 : 1 }}
                              >
                                {transferring === key ? "Marking…" : "Mark Transferred"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Main page — routes by role ─────────────────────────────────────────────────
export default function PayoutsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [payouts, setPayouts] = useState<ProcessedPayout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/payouts").then((r) => r.json()),
    ]).then(([p, h]: [UserProfile, ProcessedPayout[]]) => {
      setProfile(p);
      setPayouts(h);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="bs-heading" style={{ fontSize: 28, marginBottom: 3 }}>Payouts</h1>
        <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {!loading && profile
            ? profile.role === "super_admin"
              ? `${profile.username} · monthly earnings distribution`
              : `${profile.recipientName ?? profile.username} · monthly earnings distribution`
            : "Monthly earnings distribution"}
        </p>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="bs-skeleton" style={{ height: 160, borderRadius: 12 }} />
          <div className="bs-skeleton" style={{ height: 260, borderRadius: 12 }} />
        </div>
      ) : profile?.role === "super_admin" ? (
        <SuperAdminView />
      ) : (
        <MyEarningsView profile={profile!} payouts={payouts} />
      )}
    </div>
  );
}

function Stat({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div style={{ textAlign: "right" }}>
      <p style={{ fontSize: 9, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>{label}</p>
      <p className="bs-mono" style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: muted ? "var(--burgundy)" : "var(--ink)" }}>{value}</p>
    </div>
  );
}
