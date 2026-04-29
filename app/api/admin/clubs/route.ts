import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/get-session";
import { getAllClubs } from "@/lib/clubs-server";
import { getExtraClubs, createExtraClub } from "@/lib/clubs-store";
import { CLUBS } from "@/lib/clubs";

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const all = getAllClubs();
  const extraSlugs = new Set(getExtraClubs().map((c) => c.slug));
  return NextResponse.json(
    all.map((c) => ({ ...c, matchFn: undefined, isBuiltIn: !extraSlugs.has(c.slug) }))
  );
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { slug, name, city, country, currency, flag } = body;

  if (!slug || !name || !city || !currency || !flag) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (CLUBS.some((c) => c.slug === slugClean)) {
    return NextResponse.json({ error: `Slug "${slugClean}" is a built-in club and cannot be overridden.` }, { status: 409 });
  }

  try {
    const club = createExtraClub({ slug: slugClean, name, city, country: country || "", currency: currency.toLowerCase(), flag });
    return NextResponse.json(club, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 409 });
  }
}
