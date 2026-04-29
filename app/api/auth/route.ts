import { NextRequest, NextResponse } from "next/server";

async function deriveToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + ":bs-accounting-session");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.SITE_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await deriveToken(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("bs_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("bs_session");
  return res;
}
