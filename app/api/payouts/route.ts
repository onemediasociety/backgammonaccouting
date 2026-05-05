import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { getAllPayouts, recordPayout } from "@/lib/payout-store";
import type { PayoutEntry } from "@/lib/payout-store";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await getAllPayouts());
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { period, periodLabel, entries } = await req.json() as {
    period: string;
    periodLabel: string;
    entries: PayoutEntry[];
  };

  if (!period || !periodLabel || !Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const payout = await recordPayout(period, periodLabel, auth.session.username, entries);
  return NextResponse.json(payout, { status: 201 });
}
