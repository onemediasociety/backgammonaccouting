import { getSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default async function PendingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.status !== "pending") redirect("/");

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)",
      backgroundImage: "radial-gradient(ellipse 80% 50% at 5% 0%, rgba(184,144,66,0.08) 0%, transparent 60%)",
    }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 16px", textAlign: "center" }}>
        {/* Logo */}
        <div style={{
          width: 52, height: 52, borderRadius: 12, margin: "0 auto 20px",
          background: "linear-gradient(135deg, #b89042 0%, #8a6a2a 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: 20, fontWeight: 700, color: "#fff",
        }}>BS</div>

        <div className="bs-card" style={{ padding: "36px 32px" }}>
          {/* Hourglass icon */}
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>

          <h1 style={{
            fontFamily: "var(--font-cormorant, Georgia, serif)",
            fontSize: 22, fontWeight: 700, color: "var(--ink)", marginBottom: 10,
          }}>
            Account Pending Approval
          </h1>

          <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 8 }}>
            Welcome, <strong style={{ color: "var(--ink)" }}>{session.username}</strong>.
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 24 }}>
            Your account has been created and is waiting for a Society admin to assign your city.
            You'll have access to the dashboard as soon as your account is fully set up.
          </p>

          <div style={{
            background: "rgba(184,144,66,0.08)", border: "1px solid rgba(184,144,66,0.2)",
            borderRadius: 8, padding: "12px 16px", marginBottom: 24,
            fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-dm-mono, monospace)",
          }}>
            No action needed on your end — we'll notify you when you're set up.
          </div>

          <LogoutButton compact={false} />
        </div>
      </div>
    </div>
  );
}
