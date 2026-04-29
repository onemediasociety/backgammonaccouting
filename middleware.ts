import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

// Paths that don't require an active session
const PUBLIC_PREFIXES = ["/login", "/register", "/pending", "/api/auth", "/_next", "/favicon"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("bs_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL(`/login?from=${encodeURIComponent(pathname)}`, req.url));
  }

  const session = await verifySession(token);
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Pending users can only see /pending
  if (session.status === "pending") {
    return NextResponse.redirect(new URL("/pending", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
