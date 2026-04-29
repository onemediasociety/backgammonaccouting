import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/get-session";
import { getVenueMappings, createVenueMapping, deleteVenueMapping } from "@/lib/venues-store";

export async function GET() {
  try { await requireSuperAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getVenueMappings());
}

export async function POST(req: NextRequest) {
  try { await requireSuperAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { keyword, clubSlug } = await req.json();
  if (!keyword || !clubSlug) {
    return NextResponse.json({ error: "keyword and clubSlug are required." }, { status: 400 });
  }
  try {
    const entry = createVenueMapping(keyword, clubSlug);
    return NextResponse.json(entry, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest) {
  try { await requireSuperAdmin(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { keyword, clubSlug } = await req.json();
  const deleted = deleteVenueMapping(keyword, clubSlug);
  return NextResponse.json({ deleted });
}
