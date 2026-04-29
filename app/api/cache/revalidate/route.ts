import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSuperAdminApi } from "@/lib/api-auth";

export async function POST() {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  revalidateTag("stripe-data", "max");
  return NextResponse.json({ ok: true, revalidated: true });
}
