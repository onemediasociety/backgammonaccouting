import { getPayoutById, getYtdForRecipient } from "@/lib/payout-store";
import { formatAmount } from "@/lib/clubs";
import { requireSuperAdmin } from "@/lib/get-session";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ recipient?: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const { recipient } = await searchParams;

  const payout = getPayoutById(id);
  if (!payout || !recipient) notFound();

  const recipientEntries = payout.entries.filter((e) => e.recipientName === recipient);
  if (recipientEntries.length === 0) notFound();

  const year = parseInt(payout.period.split("-")[0]);
  const ytd = getYtdForRecipient(recipient, year);

  // Group by currency
  const totalByCurrency: Record<string, number> = {};
  for (const e of recipientEntries) {
    totalByCurrency[e.currency] = (totalByCurrency[e.currency] ?? 0) + e.amountCents;
  }

  const email = recipientEntries[0]?.recipientEmail;

  return (
    <html>
      <head>
        <title>Earnings Statement — {recipient} — {payout.periodLabel}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Georgia, serif; font-size: 13px; color: #1a1611; background: #fff; padding: 48px; max-width: 720px; margin: 0 auto; }
          @media print { body { padding: 24px; } .no-print { display: none; } }
          h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 4px; }
          h2 { font-size: 14px; font-weight: 600; margin-bottom: 10px; }
          .mono { font-family: 'Courier New', monospace; }
          .header { border-bottom: 2px solid #1a1611; padding-bottom: 16px; margin-bottom: 24px; }
          .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
          .society { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #8a6a2a; margin-bottom: 6px; }
          .meta { font-size: 11px; color: #666; text-align: right; }
          .meta strong { color: #1a1611; display: block; font-size: 13px; }
          .recipient-block { background: #f9f7f3; border: 1px solid #e0d8cc; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
          .recipient-block .label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #8a6a2a; margin-bottom: 3px; }
          .recipient-block .name { font-size: 18px; font-weight: 700; }
          .recipient-block .email { font-size: 11px; color: #666; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; font-family: 'Courier New', monospace; padding: 8px 12px; border-bottom: 1px solid #e0d8cc; text-align: left; }
          th.right, td.right { text-align: right; }
          td { padding: 10px 12px; border-bottom: 1px solid #f0ebe2; font-size: 13px; }
          tr:last-child td { border-bottom: none; }
          .total-row td { border-top: 2px solid #1a1611; font-weight: 700; padding-top: 12px; }
          .totals-section { display: flex; gap: 16px; margin-bottom: 28px; }
          .total-box { flex: 1; border: 1px solid #e0d8cc; border-radius: 8px; padding: 14px 18px; }
          .total-box .label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #8a6a2a; margin-bottom: 4px; }
          .total-box .amount { font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace; }
          .total-box.highlight { background: #1a1611; border-color: #1a1611; }
          .total-box.highlight .label { color: rgba(240,235,226,0.5); }
          .total-box.highlight .amount { color: #b89042; }
          .note { font-size: 11px; color: #666; line-height: 1.6; border-top: 1px solid #e0d8cc; padding-top: 16px; }
          .note strong { color: #1a1611; }
          .print-btn { display: inline-block; margin-bottom: 24px; padding: 8px 20px; background: #1a1611; color: #b89042; border: none; border-radius: 7px; font-size: 11px; font-family: 'Courier New', monospace; cursor: pointer; letter-spacing: 0.06em; text-transform: uppercase; }
        `}</style>
      </head>
      <body>
        <button className="print-btn no-print" onClick={() => window.print()}>Print / Save as PDF</button>

        <div className="header">
          <div className="header-top">
            <div>
              <div className="society">The Backgammon Society</div>
              <h1>Earnings Statement</h1>
            </div>
            <div className="meta">
              <strong>{payout.periodLabel}</strong>
              Issued: {new Date(payout.processedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              <br />Statement ID: <span className="mono">{payout.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="recipient-block">
          <div className="label">Payee</div>
          <div className="name">{recipient}</div>
          {email && <div className="email">{email}</div>}
        </div>

        <h2>Earnings by Club</h2>
        <table>
          <thead>
            <tr>
              <th>Club / City</th>
              <th className="right">Net Revenue</th>
              <th className="right">Your Split</th>
              <th className="right">Your Earnings</th>
            </tr>
          </thead>
          <tbody>
            {recipientEntries.map((e, i) => (
              <tr key={i}>
                <td>{e.clubCity}</td>
                <td className="right mono">{formatAmount(e.netCents, e.currency)}</td>
                <td className="right mono">{e.pct}%</td>
                <td className="right mono" style={{ fontWeight: 700 }}>{formatAmount(e.amountCents, e.currency)}</td>
              </tr>
            ))}
            {Object.entries(totalByCurrency).map(([currency, cents]) => (
              <tr key={currency} className="total-row">
                <td colSpan={3}>Total Earnings ({currency.toUpperCase()})</td>
                <td className="right mono">{formatAmount(cents, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals-section">
          {Object.entries(totalByCurrency).map(([currency, cents]) => (
            <div key={currency} className="total-box highlight">
              <div className="label">This Period ({currency.toUpperCase()})</div>
              <div className="amount">{formatAmount(cents, currency)}</div>
            </div>
          ))}
          {Object.entries(ytd).map(([currency, cents]) => (
            <div key={currency} className="total-box">
              <div className="label">YTD {year} ({currency.toUpperCase()})</div>
              <div className="amount">{formatAmount(cents, currency)}</div>
            </div>
          ))}
        </div>

        <div className="note">
          <strong>Tax Information:</strong> This statement summarizes your earnings from The Backgammon Society
          for the period above. Please retain this document for your tax records. Earnings of $600 or more
          in a calendar year may be reportable on Form 1099-NEC. The YTD total above reflects all processed
          payouts to you in {year}. Contact your tax advisor for guidance on reporting obligations.
          <br /><br />
          <strong>Payer:</strong> The Backgammon Society &nbsp;·&nbsp;
          <strong>Period:</strong> {payout.periodLabel} &nbsp;·&nbsp;
          <strong>Processed by:</strong> {payout.processedBy}
        </div>
      </body>
    </html>
  );
}
