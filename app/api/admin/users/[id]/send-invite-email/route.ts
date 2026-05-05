import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import { getUserById } from "@/lib/users-store";
import { Resend } from "resend";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured" }, { status: 503 });
  }

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { inviteUrl, toEmail, toName } = await req.json() as {
    inviteUrl: string;
    toEmail: string;
    toName?: string;
  };

  if (!toEmail) return NextResponse.json({ error: "Email address required" }, { status: 400 });
  if (!inviteUrl) return NextResponse.json({ error: "Invite URL required" }, { status: 400 });

  const resend = new Resend(apiKey);
  const displayName = toName || user.username;
  const fromAddress = process.env.RESEND_FROM_EMAIL || "noreply@backgammon-society.com";

  const { error } = await resend.emails.send({
    from: `Backgammon Society <${fromAddress}>`,
    to: toEmail,
    subject: "You've been invited to Backgammon Society Accounting",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f3ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#1c1812;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:32px 36px 24px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,#b89042 0%,#8a6a2a 100%);display:inline-flex;align-items:center;justify-content:center;">
            <span style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#fff;line-height:48px;display:block;width:48px;text-align:center;">BS</span>
          </div>
          <p style="margin:12px 0 0;font-family:Georgia,serif;font-size:22px;font-weight:600;color:rgba(240,235,226,0.95);">Backgammon Society</p>
          <p style="margin:2px 0 0;font-size:11px;color:rgba(240,235,226,0.4);letter-spacing:0.1em;text-transform:uppercase;">Accounting Platform</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 36px;">
          <p style="margin:0 0 8px;font-size:15px;color:rgba(240,235,226,0.9);">Hi <strong>${displayName}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:rgba(240,235,226,0.6);line-height:1.6;">
            You've been invited to join the Backgammon Society accounting platform. Click the button below to set your password and access your dashboard.
          </p>
          <a href="${inviteUrl}" style="display:inline-block;padding:12px 28px;background:#b89042;color:#1a1611;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.02em;">
            Accept Invitation →
          </a>
          <p style="margin:24px 0 0;font-size:11px;color:rgba(240,235,226,0.3);line-height:1.6;">
            Or copy this link: <span style="color:rgba(240,235,226,0.5);">${inviteUrl}</span><br>
            This link expires in 7 days.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
