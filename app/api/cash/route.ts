import { NextRequest, NextResponse } from "next/server";
import {
  getAllCashEntries,
  getCashEntriesForClub,
  addCashEntry,
} from "@/lib/cash-store";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const club = searchParams.get("club");
  const entries = club ? getCashEntriesForClub(club) : getAllCashEntries();
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clubSlug, date, event, playerCount, buyInAmount, currency, notes } =
      body;

    if (!clubSlug || !date || !event || !playerCount || !buyInAmount || !currency) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const entry = addCashEntry({
      clubSlug,
      date,
      event,
      playerCount: Number(playerCount),
      buyInAmount: Number(buyInAmount),
      currency,
      notes: notes ?? "",
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
