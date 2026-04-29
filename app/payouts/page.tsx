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

function periodToLabel(period: string) {
  const [y, m] = period.split("-");
  return `${MONTHS[parseInt(m) - 1]} ${y}`;
}

interface ClubNet {
  slug: string;
  city: string;
  flag: string;
  currency: string;
  netCents: number;
}

export default function PayoutsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [clubNets, setClubNets] = useState<ClubNet[]>([]);
  const [splits, setSplits] = useState<ClubSplit[]>([]);
  const [history, setHistory] = useState<ProcessedPayout[]>([]);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/payouts").then((r) => r.json()).then(setHistory).catch(() => {});
    fetch("/api/admin/splits").then((r) => r.json()).then(setSplits).catch(() => {});
  }, []);

  const calculate = useCallback(async () => {
    setLoadingCalc(true);
    setError("");
    try {
      const from = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const to = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

      const [paymentsRes, cashRes, feesRes] = await Promise.all([
        fetch(`/api/stripe?from=${from}&to=${to}`),
        fetch(`/api/cash?from=${from}&to=${to}`),
        fetch(`/api/stripe/fees?from=${from}&to=${to}`),
      ]);

      const payments: { clubSlug: string; amount: number; currency: string; status: string }[] =
        paymentsRes.ok ? await paymentsRes.json() : [];
      const cashEntries: { clubSlug: string; amountCents: number; currency: string }[] =
        cashRes.ok ? await cashRes.json() : [];
      const fees: Record<string, number> = feesRes.ok ? await feesRes.json() : {};

      // aggregate per club
      const stripeByClub: Record<string, { cents: number; currency: string }> = {};
      for (const p of payments) {
        if (p.status !== "succeeded") continue;
        if (!stripeByClub[p.clubSlug]) stripeByClub[p.clubSlug] = { cents: 0, currency: p.currency };
        stripeByClub[p.clubSlug].cents += p.amount;
      }
      const cashByClub: Record<string, number> = {};
      for (const c of cashEntries) cashByClub[c.clubSlug] = (cashByClub[c.clubSlug] ?? 0) + c.amountCents;

      // fetch clubs list
      const clubsRes = await fetch("/api/admin/clubs");
      const clubs: { slug: string; city: string; flag: string; currency: string }[] =
        clubsRes.ok ? await clubsRes.json() : [];

      const nets: ClubNet[] = clubs.map((c) => {
        const stripe = stripeByClub[c.slug]?.cents ?? 0;
        const cash = cashByClub[c.slug] ?? 0;
        const fee = fees[c.slug] ?? 0;
        return { slug: c.slug, city: c.city, flag: c.flag, currency: c.currency, netCents: stripe + cash - fee };
      }).filter((c) => c.netCents !== 0);

      setClubNets(nets);
    } catch {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoadingCalc(false);
    }
  }, [year, month]);

  // Build payout entries from clubNets × splits
  const entries: PayoutEntry[] = [];
  for (const club of clubNets) {
    const split = splits.find((s) => s.clubSlug === club.slug);
    if (!split) continue;
    for (const r of split.recipients) {
      entries.push({
        clubSlug: club.slug,
        clubCity: club.city,
        currency: club.currency,
        recipientName: r.name,
        recipientEmail: r.email,
        pct: r.pct,
        netCents: club.netCents,
        amountCents: Math.round(club.netCents * r.pct / 100),
      });
    }
  }

  // Group entries by recipient for the summary view
  const byRecipient: Record<string, { entries: PayoutEntry[]; totalUSD: number }> = {};
  for (const e of entries) {
    if (!byRecipient[e.recipientName]) byRecipient[e.recipientName] = { entries: [], totalUSD: 0 };
    byRecipient[e.recipientName].entries.push(e);
    if (e.currency === "usd") byRecipient[e.recipientName].totalUSD += e.amountCents;
  }

  async function processPayout() {
    if (entries.length === 0) return;
    setProcessing(true);
    setError("");
    setSuccess("");
    const period = `${year}-${String(month).padStart(2, "0")}`;
    const periodLabel = `${MONTHS[month - 1]} ${year}`;
    const res = await fetch("/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period, periodLabel, entries }),
    });
    if (res.ok) {
      const payout = await res.json();
      setHistory((prev) => [payout, ...prev]);
      setSuccess(`Payout for ${periodLabel} recorded. Download statements below.`);
      setClubNets([]);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to record payout.");
    }
    setProcessing(false);
  }

  const period = `${year}-${String(month).padStart(2, "0")}`;
  const alreadyProcessed = history.some((h) => h.period === period);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="bs-heading" style={{ fontSize: 28, marginBottom: 3 }}>Payouts</h1>
        <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Monthly earnings distribution
        </p>
      </div>

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
            <button
              onClick={calculate}
              disabled={loadingCalc}
              style={{ fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12, padding: "8px 20px", borderRadius: 8, border: "none", background: "var(--ink)", color: "var(--brass)", cursor: loadingCalc ? "wait" : "pointer", opacity: loadingCalc ? 0.6 : 1 }}
            >
              {loadingCalc ? "Calculating…" : "Calculate"}
            </button>
            {alreadyProcessed && !loadingCalc && (
              <span style={{ fontSize: 11, color: "var(--brass)", fontFamily: "var(--font-dm-mono, monospace)" }}>
                ⚠ Already processed for this period
              </span>
            )}
          </div>

          {error && (
            <div style={{ background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--burgundy)" }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: "rgba(31,77,58,0.07)", border: "1px solid rgba(31,77,58,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--bs-green, #1f4d3a)" }}>
              {success}
            </div>
          )}

          {clubNets.length > 0 && (
            <>
              {/* Per-recipient summary */}
              <div style={{ marginBottom: 20 }}>
                <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                  Recipient Summary · {MONTHS[month - 1]} {year}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {Object.entries(byRecipient).map(([name, { totalUSD }]) => (
                    <div key={name} className="bs-card" style={{ padding: "14px 16px" }}>
                      <p style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-dm-mono, monospace)", marginBottom: 4 }}>{name}</p>
                      <p className="bs-mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{fmt(totalUSD, "usd")}</p>
                      <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>{byRecipient[name].entries.length} club{byRecipient[name].entries.length > 1 ? "s" : ""}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed breakdown */}
              <div style={{ marginBottom: 20 }}>
                <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                  Detailed Breakdown
                </p>
                <div className="bs-card" style={{ overflow: "hidden" }}>
                  <table className="bs-table">
                    <thead>
                      <tr>
                        <th>Club</th>
                        <th>Recipient</th>
                        <th style={{ textAlign: "right" }}>Net Revenue</th>
                        <th style={{ textAlign: "right" }}>Split</th>
                        <th style={{ textAlign: "right" }}>Payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 13 }}>{e.clubCity}</td>
                          <td style={{ fontSize: 13 }}>{e.recipientName}</td>
                          <td className="bs-amount" style={{ textAlign: "right", fontSize: 12 }}>{fmt(e.netCents, e.currency)}</td>
                          <td className="bs-mono" style={{ textAlign: "right", fontSize: 12, color: "var(--ink-3)" }}>{e.pct}%</td>
                          <td className="bs-amount" style={{ textAlign: "right", fontSize: 13, fontWeight: 700 }}>{fmt(e.amountCents, e.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={processPayout}
                disabled={processing || alreadyProcessed}
                style={{
                  fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
                  padding: "10px 24px", borderRadius: 8, border: "none",
                  background: alreadyProcessed ? "var(--rule)" : "var(--bs-green, #1f4d3a)",
                  color: alreadyProcessed ? "var(--ink-3)" : "#fff",
                  cursor: processing || alreadyProcessed ? "not-allowed" : "pointer",
                  opacity: processing ? 0.6 : 1, fontWeight: 500,
                }}
              >
                {processing ? "Recording…" : alreadyProcessed ? "Already Processed" : `Record Payout · ${MONTHS[month - 1]} ${year}`}
              </button>
            </>
          )}
        </div>
      </section>

      {/* History */}
      <section>
        <h2 className="bs-heading" style={{ fontSize: 18, marginBottom: 14 }}>Payout History</h2>
        {history.length === 0 ? (
          <div style={{ border: "1px dashed var(--rule)", borderRadius: 10, padding: "32px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            No payouts recorded yet.
          </div>
        ) : (
          <div className="bs-card" style={{ overflow: "hidden" }}>
            <table className="bs-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Processed</th>
                  <th>By</th>
                  <th style={{ textAlign: "right" }}>Recipients</th>
                  <th style={{ textAlign: "right" }}>Statements</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => {
                  const recipients = [...new Set(p.entries.map((e) => e.recipientName))];
                  return (
                    <tr key={p.id}>
                      <td style={{ fontSize: 13, fontWeight: 600 }}>{p.periodLabel}</td>
                      <td className="bs-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                        {new Date(p.processedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="bs-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.processedBy}</td>
                      <td style={{ textAlign: "right", fontSize: 12 }}>{recipients.join(", ")}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          {recipients.map((name) => (
                            <Link
                              key={name}
                              href={`/payouts/${p.id}/statement?recipient=${encodeURIComponent(name)}`}
                              target="_blank"
                              style={{ fontSize: 11, fontFamily: "var(--font-dm-mono, monospace)", color: "var(--brass)", textDecoration: "none", padding: "3px 8px", border: "1px solid rgba(184,144,66,0.3)", borderRadius: 6 }}
                            >
                              {name} ↗
                            </Link>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
