import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import { registerUser } from "@/lib/users-store";

export async function POST(req: NextRequest) {
  const { username = "", password = "" } = await req.json();

  if (!username || username.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  let user;
  try {
    user = registerUser({ username: username.trim(), password });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Registration failed";
    return NextResponse.json({ error: msg }, { status: msg.includes("already taken") ? 409 : 400 });
  }

  const token = await createSession({
    sub: user.id,
    username: user.username,
    role: user.role,
    clubSlugs: [],
    status: "pending",
  });

  const res = NextResponse.json({ ok: true, status: "pending" });
  res.cookies.set("bs_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
