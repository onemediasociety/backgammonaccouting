import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { syncSplitsFromSeed } from "@/lib/splits-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const splits = await syncSplitsFromSeed();
  return NextResponse.json({
    synced: splits.length,
    splits: splits.map((s) => ({
      clubSlug: s.clubSlug,
      recipients: s.recipients.map((r) => `${r.name} ${r.pct}%`).join(", "),
    })),
  });
}
