import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { getAllUsers, createUser } from "@/lib/users-store";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json(getAllUsers());
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { username, password, clubSlugs } = await req.json();

  if (!username || !password || !Array.isArray(clubSlugs)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const user = createUser({ username, password, clubSlugs });
    return NextResponse.json(user, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create user";
    const status = msg.includes("already taken") ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
