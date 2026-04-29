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

  const { clubSlug, ownerPct, adminPct } = await req.json();

  if (!clubSlug || ownerPct == null || adminPct == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const split = upsertSplit(clubSlug, Number(ownerPct), Number(adminPct));
    return NextResponse.json(split);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update split";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
