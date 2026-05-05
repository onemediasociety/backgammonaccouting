import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { loadTokens } from "@/lib/qbo-client";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const tokens = await loadTokens();
  if (!tokens) return NextResponse.json({ connected: false });

  const refreshValid = tokens.refreshExpiresAt > Date.now();
  return NextResponse.json({
    connected: refreshValid,
    realmId: tokens.realmId,
    expiresAt: tokens.expiresAt,
    refreshExpiresAt: tokens.refreshExpiresAt,
  });
}

export async function DELETE() {
  const { put } = await import("@vercel/blob");
  // Overwrite tokens with empty to disconnect
  await put("qbo/tokens.json", JSON.stringify({}), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return NextResponse.json({ ok: true });
}
