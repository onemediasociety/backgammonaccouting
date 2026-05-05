import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { getPayoutById } from "@/lib/payout-store";
import { createAndSendInvoice } from "@/lib/qbo-client";

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { payoutId, recipientName } = await req.json() as {
    payoutId: string;
    recipientName?: string; // if omitted, sends for all recipients
  };

  const payout = await getPayoutById(payoutId);
  if (!payout) return NextResponse.json({ error: "Payout not found" }, { status: 404 });

  // Group entries by recipient
  const byRecipient = new Map<string, typeof payout.entries>();
  for (const entry of payout.entries) {
    if (recipientName && entry.recipientName !== recipientName) continue;
    if (!entry.recipientEmail) continue; // skip recipients without email
    const existing = byRecipient.get(entry.recipientName) ?? [];
    existing.push(entry);
    byRecipient.set(entry.recipientName, existing);
  }

  if (byRecipient.size === 0) {
    return NextResponse.json({ error: "No recipients with email addresses found" }, { status: 400 });
  }

  const results: { recipient: string; invoiceId?: string; error?: string }[] = [];

  for (const [name, entries] of byRecipient) {
    const email = entries[0].recipientEmail!;
    try {
      const lines = entries.map((e) => ({
        description: `${e.clubCity} – ${payout.periodLabel} (${e.pct}% of net)`,
        amount: e.amountCents / 100,
      }));

      const invoiceId = await createAndSendInvoice({
        customerName: name,
        customerEmail: email,
        lines,
        memo: `Backgammon Society earnings – ${payout.periodLabel}`,
        currency: entries[0].currency,
      });
      results.push({ recipient: name, invoiceId });
    } catch (e) {
      results.push({ recipient: name, error: e instanceof Error ? e.message : "Failed" });
    }
  }

  const allOk = results.every((r) => !r.error);
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 });
}
