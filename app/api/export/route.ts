import { NextRequest, NextResponse } from "next/server";
import { fetchPaymentsForClub } from "@/lib/stripe-client";
import { getCashEntriesForClub } from "@/lib/cash-store";
import { getClub, formatAmount } from "@/lib/clubs";

function toTs(dateStr: string | null, endOfDay = false): number | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}

function escapeCSV(val: string | number | null | undefined): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCSV).join(",");
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slug = searchParams.get("club");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!slug) {
    return NextResponse.json({ error: "club param required" }, { status: 400 });
  }

  const club = getClub(slug);
  if (!club) {
    return NextResponse.json({ error: "Unknown club" }, { status: 404 });
  }

  const fromTs = toTs(from);
  const toTs_ = toTs(to, true);

  let stripeRows: string[] = [];
  try {
    const payments = await fetchPaymentsForClub(slug, fromTs, toTs_);
    stripeRows = payments
      .filter((p) => p.status === "succeeded")
      .map((p) =>
        row([
          new Date(p.created * 1000).toISOString().slice(0, 10),
          "Stripe",
          p.description ?? "Online buy-in",
          "",
          formatAmount(p.amount, p.currency),
          p.currency.toUpperCase(),
          p.status,
          p.id,
        ])
      );
  } catch {
    // Stripe unavailable — export cash only
  }

  const cashEntries = await getCashEntriesForClub(slug, from ?? undefined, to ?? undefined);
  const cashRows = cashEntries.map((e) =>
    row([
      e.date,
      "Cash",
      e.event,
      e.playerCount,
      formatAmount(e.totalAmount, e.currency),
      e.currency.toUpperCase(),
      "collected",
      e.id,
    ])
  );

  const header = row(["Date", "Type", "Description", "Players", "Amount", "Currency", "Status", "ID"]);
  const periodStr = from && to ? `_${from}_to_${to}` : "";
  const filename = `${slug}${periodStr}.csv`;

  const csv = [header, ...stripeRows, ...cashRows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
