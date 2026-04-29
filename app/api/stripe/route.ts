import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllPayments,
  fetchPaymentsForClub,
  fetchBalance,
  buildClubSummaries,
} from "@/lib/stripe-client";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const club = searchParams.get("club");
  const view = searchParams.get("view");

  try {
    if (view === "balance") {
      const balance = await fetchBalance();
      return NextResponse.json(balance);
    }
    if (view === "summaries") {
      const summaries = await buildClubSummaries();
      return NextResponse.json(summaries);
    }
    if (club) {
      const payments = await fetchPaymentsForClub(club);
      return NextResponse.json(payments);
    }
    const payments = await fetchAllPayments();
    return NextResponse.json(payments);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
