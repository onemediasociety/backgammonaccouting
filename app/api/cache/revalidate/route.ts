import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAnyAdminApi } from "@/lib/api-auth";

export async function POST() {
  const auth = await requireAnyAdminApi();
  if (auth instanceof NextResponse) return auth;

  revalidateTag("stripe-data", "default");
  return NextResponse.json({ ok: true, revalidated: true });
}
