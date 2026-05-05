import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { markTransferred } from "@/lib/payout-store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { recipientName, note } = await req.json();

  if (!recipientName) {
    return NextResponse.json({ error: "recipientName required" }, { status: 400 });
  }

  const payout = await markTransferred(id, recipientName, note);
  if (!payout) return NextResponse.json({ error: "Payout not found" }, { status: 404 });

  return NextResponse.json(payout);
}
