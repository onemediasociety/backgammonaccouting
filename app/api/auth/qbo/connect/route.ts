import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { getAuthUrl } from "@/lib/qbo-client";
import { createSession } from "@/lib/session";
import crypto from "crypto";

export async function GET(req: Request) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  // Use a random state token to prevent CSRF
  const state = crypto.randomBytes(16).toString("hex");

  // Store state in a short-lived cookie
  const url = getAuthUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set("qbo_oauth_state", state, {
    httpOnly: true,
    maxAge: 600, // 10 minutes
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
