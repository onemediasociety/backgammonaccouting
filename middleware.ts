import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

// Routes that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth",          // login (POST) + logout (DELETE)
  "/api/auth/register",
  "/api/auth/invite-info",
  "/api/auth/invite-register",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static files
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("bs_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const session = await verifySession(token);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const res = NextResponse.redirect(url);
    res.cookies.delete("bs_session");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
