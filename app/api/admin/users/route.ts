import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { getAllUsers, createUser } from "@/lib/users-store";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json(await getAllUsers());
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { username, password, clubSlugs, email, role, status } = await req.json();

  if (!username || !Array.isArray(clubSlugs)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const user = await createUser({ username, password: password || Math.random().toString(36).slice(2) + "Bs1!", clubSlugs, email, role, status });
    return NextResponse.json(user, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create user";
    return NextResponse.json({ error: msg }, { status: msg.includes("already taken") ? 409 : 400 });
  }
}
