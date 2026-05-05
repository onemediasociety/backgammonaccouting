import { NextRequest, NextResponse } from "next/server";
import { getUserByInviteToken } from "@/lib/users-store";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const user = await getUserByInviteToken(token);
  if (!user) return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });

  return NextResponse.json({
    username: user.username,
    recipientName: user.recipientName ?? null,
    clubSlugs: user.clubSlugs,
  });
}
