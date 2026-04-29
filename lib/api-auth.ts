import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySession, type SessionPayload } from "./session";

async function getApiSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("bs_session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireAnyAdminApi(): Promise<
  { session: SessionPayload } | NextResponse
> {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.status === "pending") {
    return NextResponse.json({ error: "Account pending approval" }, { status: 403 });
  }
  return { session };
}

export async function requireSuperAdminApi(): Promise<
  { session: SessionPayload } | NextResponse
> {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { session };
}
