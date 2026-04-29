import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = ["/login", "/api/auth"];

async function expectedToken(): Promise<string> {
  const password = process.env.SITE_PASSWORD ?? "";
  const data = new TextEncoder().encode(password + ":bs-accounting-session");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // If no password is configured, allow all access
  if (!process.env.SITE_PASSWORD) {
    return NextResponse.next();
  }

  const session = req.cookies.get("bs_session")?.value;
  const expected = await expectedToken();

  if (session === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
