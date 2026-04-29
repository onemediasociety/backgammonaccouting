import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/get-session";
import { updateExtraClub, deleteExtraClub, getExtraClubs } from "@/lib/clubs-store";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  const body = await req.json();
  try {
    const club = updateExtraClub(slug, body);
    return NextResponse.json(club);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  // Prevent deleting built-in clubs
  const extra = getExtraClubs();
  if (!extra.some((c) => c.slug === slug)) {
    return NextResponse.json({ error: "Built-in clubs cannot be deleted." }, { status: 403 });
  }
  const ok = deleteExtraClub(slug);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Club not found." }, { status: 404 });
}
