import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllPayments,
  fetchPaymentsForClub,
  fetchBalance,
  buildClubSummaries,
} from "@/lib/stripe-client";

function toTs(dateStr: string | null, endOfDay = false): number | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const club = searchParams.get("club");
  const view = searchParams.get("view");
  const fromTs = toTs(searchParams.get("from"));
  const toTs_ = toTs(searchParams.get("to"), true);

  try {
    if (view === "balance") {
      const balance = await fetchBalance();
      return NextResponse.json(balance);
    }
    if (view === "summaries") {
      const summaries = await buildClubSummaries(fromTs, toTs_);
      return NextResponse.json(summaries);
    }
    if (club) {
      const payments = await fetchPaymentsForClub(club, fromTs, toTs_);
      return NextResponse.json(payments);
    }
    const payments = await fetchAllPayments(fromTs, toTs_);
    return NextResponse.json(payments);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
