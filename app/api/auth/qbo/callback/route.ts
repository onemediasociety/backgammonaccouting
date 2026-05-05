import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, saveTokens } from "@/lib/qbo-client";
import { getSession } from "@/lib/get-session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/admin?qbo_error=${encodeURIComponent(error)}`, req.url));
  }

  const savedState = req.cookies.get("qbo_oauth_state")?.value;
  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL("/admin?qbo_error=invalid_state", req.url));
  }

  if (!code || !realmId) {
    return NextResponse.redirect(new URL("/admin?qbo_error=missing_params", req.url));
  }

  try {
    const tokens = await exchangeCode(code, realmId);
    await saveTokens(tokens);
    const res = NextResponse.redirect(new URL("/admin?qbo_connected=1", req.url));
    res.cookies.delete("qbo_oauth_state");
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.redirect(new URL(`/admin?qbo_error=${encodeURIComponent(msg)}`, req.url));
  }
}
