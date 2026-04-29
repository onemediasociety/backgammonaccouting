import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { getAllSplits, upsertSplit } from "@/lib/splits-store";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(getAllSplits());
}

export async function PUT(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { clubSlug, recipients } = await req.json();
  if (!clubSlug || !Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const split = upsertSplit(clubSlug, recipients);
    return NextResponse.json(split);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update split";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
