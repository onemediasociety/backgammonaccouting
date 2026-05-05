import { NextRequest, NextResponse } from "next/server";
import { requireAnyAdminApi } from "@/lib/api-auth";
import { getUserById, updateUser, updateUserBankDetails, hashPassword, type BankDetails } from "@/lib/users-store";

export async function GET(_req: NextRequest) {
  const auth = await requireAnyAdminApi();
  if (auth instanceof NextResponse) return auth;

  if (auth.session.sub === "__virtual_admin__") {
    return NextResponse.json({
      id: "__virtual_admin__",
      username: auth.session.username,
      role: "super_admin",
      recipientName: "Hugo Partouche",
      clubSlugs: [],
    });
  }

  const user = await getUserById(auth.session.sub);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { passwordHash: _ph, ...safe } = user;
  return NextResponse.json(safe);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAnyAdminApi();
  if (auth instanceof NextResponse) return auth;

  if (auth.session.sub === "__virtual_admin__") {
    return NextResponse.json({ error: "Use Settings to manage the super admin account" }, { status: 400 });
  }

  const body = await req.json();
  const { bankDetails, preferredCurrency, email, currentPassword, newPassword } = body as {
    bankDetails?: BankDetails | null;
    preferredCurrency?: string | null;
    email?: string | null;
    currentPassword?: string;
    newPassword?: string;
  };

  try {
    let user;

    if (newPassword !== undefined) {
      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
      }
      const stored = await getUserById(auth.session.sub);
      if (!stored) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (currentPassword && stored.passwordHash !== hashPassword(currentPassword)) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
      user = await updateUser(auth.session.sub, { password: newPassword });
    }

    if (bankDetails !== undefined) {
      user = await updateUserBankDetails(auth.session.sub, bankDetails ?? null);
    }
    if (preferredCurrency !== undefined || email !== undefined) {
      user = await updateUser(auth.session.sub, {
        ...(preferredCurrency !== undefined ? { preferredCurrency: preferredCurrency ?? null } : {}),
        ...(email !== undefined ? { email: email ?? null } : {}),
      });
    }
    if (!user) {
      const stored = await getUserById(auth.session.sub);
      if (!stored) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const { passwordHash: _ph, ...safe } = stored;
      user = safe;
    }
    return NextResponse.json(user);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update profile";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
