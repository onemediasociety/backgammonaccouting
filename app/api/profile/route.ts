import { NextRequest, NextResponse } from "next/server";
import { requireAnyAdminApi } from "@/lib/api-auth";
import { getUserById, updateUserBankDetails, type BankDetails } from "@/lib/users-store";

export async function GET(_req: NextRequest) {
  const auth = await requireAnyAdminApi();
  if (auth instanceof NextResponse) return auth;

  const user = getUserById(auth.session.sub);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { passwordHash: _ph, ...safe } = user;
  return NextResponse.json(safe);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAnyAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { bankDetails } = body as { bankDetails: BankDetails | null };

  try {
    const user = updateUserBankDetails(auth.session.sub, bankDetails);
    return NextResponse.json(user);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update profile";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
