import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import { verifyUserPassword } from "@/lib/users-store";

export async function POST(req: NextRequest) {
  const { username = "", password = "" } = await req.json();

  let token: string;
  let status: "active" | "pending" = "active";

  const sitePassword = process.env.SITE_PASSWORD;
  if (sitePassword && password === sitePassword) {
    token = await createSession({
      sub: "__virtual_admin__",
      username: username || "admin",
      role: "super_admin",
      clubSlugs: [],
      status: "active",
    });
  } else {
    const user = await verifyUserPassword(username, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    status = user.status ?? "active";
    token = await createSession({
      sub: user.id,
      username: user.username,
      role: user.role,
      clubSlugs: user.clubSlugs,
      status,
    });
  }

  const res = NextResponse.json({ ok: true, status });
  res.cookies.set("bs_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("bs_session");
  return res;
}
