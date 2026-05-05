import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { getUserById, createInviteToken } from "@/lib/users-store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const user = getUserById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { token } = createInviteToken(id);

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const inviteUrl = `${origin}/register?token=${token}`;

  return NextResponse.json({
    inviteUrl,
    username: user.username,
    expiresInDays: 7,
  });
}
