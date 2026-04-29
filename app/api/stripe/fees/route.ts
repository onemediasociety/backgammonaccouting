import { NextRequest, NextResponse } from "next/server";
import { fetchFeesByClub } from "@/lib/stripe-client";

function toTs(dateStr: string | null, endOfDay = false): number | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const fromTs = toTs(sp.get("from"));
  const toTs_ = toTs(sp.get("to"), true);
  try {
    const fees = await fetchFeesByClub(fromTs, toTs_);
    return NextResponse.json(fees);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
