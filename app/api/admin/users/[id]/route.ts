import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { getUserById, updateUser, deleteUser, getAllUsers } from "@/lib/users-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const users = getAllUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  if (id === "__virtual_admin__") {
    return NextResponse.json({ error: "Cannot modify the virtual admin" }, { status: 400 });
  }

  const { username, password, clubSlugs } = await req.json();

  try {
    const user = updateUser(id, {
      username: username || undefined,
      password: password || undefined,
      clubSlugs: clubSlugs !== undefined ? clubSlugs : undefined,
    });
    return NextResponse.json(user);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update user";
    const status = msg.includes("not found") ? 404 : msg.includes("already taken") ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  if (id === "__virtual_admin__") {
    return NextResponse.json({ error: "Cannot delete the virtual admin" }, { status: 400 });
  }

  const ok = deleteUser(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
