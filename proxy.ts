import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, type SessionPayload } from "./lib/session";

const PUBLIC = ["/login", "/api/auth"];
const SUPER_ADMIN_ONLY = ["/admin", "/reports", "/payouts", "/members"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // No auth configured at all — allow everything (dev mode without any password)
  if (!process.env.SITE_PASSWORD && !process.env.SESSION_SECRET) {
    return NextResponse.next();
  }

  const token = req.cookies.get("bs_session")?.value;
  if (!token) return toLogin(req, pathname);

  const session = await verifySession(token);
  if (!session) return toLogin(req, pathname);

  // Super admin: unrestricted access
  if (session.role === "super_admin") return NextResponse.next();

  // Club admin: enforce restrictions
  if (SUPER_ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    return toHomeClub(req, session);
  }

  if (pathname === "/") {
    return toHomeClub(req, session);
  }

  // Block access to clubs the admin isn't assigned to
  const clubMatch = pathname.match(/^\/clubs\/([^/]+)/);
  if (clubMatch) {
    const slug = clubMatch[1];
    if (!session.clubSlugs.includes(slug)) {
      return toHomeClub(req, session);
    }
  }

  // Block export API calls for clubs they don't manage
  if (pathname.startsWith("/api/export")) {
    const club = req.nextUrl.searchParams.get("club");
    if (club && !session.clubSlugs.includes(club)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

function toLogin(req: NextRequest, from: string): NextResponse {
  const url = new URL("/login", req.url);
  url.searchParams.set("from", from);
  return NextResponse.redirect(url);
}

function toHomeClub(req: NextRequest, session: SessionPayload): NextResponse {
  const home = session.clubSlugs[0];
  if (!home) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.redirect(new URL(`/clubs/${home}`, req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
