import { notFound } from "next/navigation";
import { getClub, formatAmount } from "@/lib/clubs";
import { fetchPaymentsForClub } from "@/lib/stripe-client";
import { getCashEntriesForClub } from "@/lib/cash-store";
import { parseDateRange } from "@/lib/date-range";

export const dynamic = "force-dynamic";

function toTs(dateStr: string | null, endOfDay = false): number | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string; period?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const club = getClub(slug);
  if (!club) notFound();

  const range = parseDateRange({
    get: (k: string) => (sp as Record<string, string>)[k] ?? null,
  });

  const fromTs = toTs(range.from);
  const toTs_ = toTs(range.to, true);

  let stripePayments: Awaited<ReturnType<typeof fetchPaymentsForClub>> = [];
  try {
    stripePayments = await fetchPaymentsForClub(club.slug, fromTs, toTs_);
  } catch {
    stripePayments = [];
  }

  const succeeded = stripePayments.filter((p) => p.status === "succeeded");
  const cashEntries = getCashEntriesForClub(club.slug, range.from ?? undefined, range.to ?? undefined);

  const stripeTotal = succeeded.reduce((s, p) => s + p.amount, 0);
  const cashTotal = cashEntries.reduce((s, e) => s + e.totalAmount, 0);

  const periodLabel =
    range.from && range.to ? `${range.from} – ${range.to}` : "All Time";

  const printedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <html>
      <head>
        <title>{`${club.name} — ${periodLabel}`}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, sans-serif; font-size: 13px; color: #111; padding: 32px; }
          h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
          h2 { font-size: 14px; font-weight: 600; margin: 24px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
          .meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; padding: 6px 8px; border-bottom: 2px solid #e5e7eb; }
          td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; }
          .right { text-align: right; }
          .total-row td { font-weight: 700; border-top: 2px solid #e5e7eb; border-bottom: none; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
          .summary-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; }
          .summary-box .label { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #9ca3af; }
          .summary-box .value { font-size: 18px; font-weight: 700; margin-top: 2px; }
          .highlight { background: #1d4ed8; color: white; }
          .highlight .label { color: #bfdbfe; }
          @media print { @page { margin: 20mm; } body { padding: 0; } }
        `}</style>
      </head>
      <body>
        <h1>{club.flag} {club.name}</h1>
        <p className="meta">Period: {periodLabel} · Printed: {printedAt}</p>

        <div className="summary">
          <div className="summary-box">
            <div className="label">Stripe Revenue</div>
            <div className="value">{formatAmount(stripeTotal, club.currency)}</div>
          </div>
          <div className="summary-box">
            <div className="label">Cash Buy-ins</div>
            <div className="value">{formatAmount(cashTotal, club.currency)}</div>
          </div>
          <div className="summary-box highlight">
            <div className="label">Combined Total</div>
            <div className="value">{formatAmount(stripeTotal + cashTotal, club.currency)}</div>
          </div>
        </div>

        {succeeded.length > 0 && (
          <>
            <h2>Stripe Payments ({succeeded.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Description</th><th className="right">Amount</th><th>ID</th>
                </tr>
              </thead>
              <tbody>
                {succeeded.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.created * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
                    <td>{p.description ?? "Online buy-in"}</td>
                    <td className="right">{formatAmount(p.amount, p.currency)}</td>
                    <td style={{ fontSize: "10px", color: "#9ca3af" }}>{p.id}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={2}>Stripe Total</td>
                  <td className="right">{formatAmount(stripeTotal, club.currency)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </>
        )}

        {cashEntries.length > 0 && (
          <>
            <h2>Cash Buy-ins ({cashEntries.length} events)</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Event</th><th className="right">Players</th><th className="right">Buy-in</th><th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {cashEntries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td>{e.event}{e.notes ? ` — ${e.notes}` : ""}</td>
                    <td className="right">{e.playerCount}</td>
                    <td className="right">{formatAmount(e.buyInAmount, e.currency)}</td>
                    <td className="right">{formatAmount(e.totalAmount, e.currency)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={4}>Cash Total</td>
                  <td className="right">{formatAmount(cashTotal, club.currency)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        <script dangerouslySetInnerHTML={{ __html: "window.onload = () => window.print();" }} />
      </body>
    </html>
  );
}
