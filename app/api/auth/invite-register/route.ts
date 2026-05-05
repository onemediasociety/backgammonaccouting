import { NextRequest, NextResponse } from "next/server";
import { acceptInvite } from "@/lib/users-store";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { token = "", password = "" } = await req.json();

  if (!token) return NextResponse.json({ error: "Invite token required" }, { status: 400 });
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  let user;
  try {
    user = acceptInvite(token, password);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to activate account";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const sessionToken = await createSession({
    sub: user.id,
    username: user.username,
    role: user.role,
    clubSlugs: user.clubSlugs,
    status: "active",
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("bs_session", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
