"use client";

import { useState } from "react";
import Link from "next/link";
import { CLUBS } from "@/lib/clubs";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--rule)", background: "var(--paper)",
  color: "var(--ink)", fontSize: 13,
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 10, fontFamily: "var(--font-dm-mono, monospace)",
  color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6,
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 5, fontFamily: "var(--font-dm-mono, monospace)" }}>{hint}</p>}
    </div>
  );
}

interface InviteResult {
  inviteUrl: string;
  username: string;
  userId: string;
}

export default function NewUserPage() {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    role: "club_admin" as "club_admin" | "super_admin",
    clubSlugs: [] as string[],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  function handleNameChange(name: string) {
    setForm((p) => ({
      ...p,
      name,
      // Auto-fill username from name if not manually edited
      username: p.username === slugify(p.name) || p.username === "" ? slugify(name) : p.username,
    }));
  }

  function slugify(s: string) {
    return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  function toggleClub(slug: string) {
    setForm((prev) => ({
      ...prev,
      clubSlugs: prev.clubSlugs.includes(slug)
        ? prev.clubSlugs.filter((s) => s !== slug)
        : [...prev.clubSlugs, slug],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.username.trim()) { setError("Username is required."); return; }
    if (form.role === "club_admin" && form.clubSlugs.length === 0) {
      setError("Assign at least one club for a club admin.");
      return;
    }
    setSaving(true);
    try {
      // 1. Create user
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim() || undefined,
          role: form.role,
          clubSlugs: form.clubSlugs,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create user."); return; }

      // 2. Auto-generate invite link
      const invRes = await fetch(`/api/admin/users/${data.id}/invite`, { method: "POST" });
      const invData = await invRes.json();
      if (invRes.ok) {
        setInvite({ inviteUrl: invData.inviteUrl, username: data.username, userId: data.id });
      } else {
        // Created but invite failed — go to list
        window.location.href = "/admin/users";
      }
    } finally {
      setSaving(false);
    }
  }

  function copy() {
    if (!invite) return;
    navigator.clipboard.writeText(invite.inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  async function sendEmail() {
    if (!invite || !form.email.trim()) return;
    setSending(true);
    setEmailError("");
    try {
      const res = await fetch(`/api/admin/users/${invite.userId}/send-invite-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteUrl: invite.inviteUrl,
          toEmail: form.email.trim(),
          toName: form.name.trim() || invite.username,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error ?? "Failed to send email."); return; }
      setEmailSent(true);
    } finally {
      setSending(false);
    }
  }

  // ── Step 2: Invite sent ───────────────────────────────────────────────────
  if (invite) {
    return (
      <div style={{ maxWidth: 480 }}>
        <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          <Link href="/admin" style={{ color: "inherit", textDecoration: "none" }}>Settings</Link>
          {" / "}
          <Link href="/admin/users" style={{ color: "inherit", textDecoration: "none" }}>Users</Link>
          {" / "}New
        </p>
        <h1 className="bs-heading" style={{ fontSize: 24, marginBottom: 6 }}>Account Created</h1>
        <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 24 }}>
          Send <strong>{form.name || invite.username}</strong> the invite link below to let them set their password and activate their account.
        </p>

        <div className="bs-card" style={{ padding: "20px", marginBottom: 16 }}>
          <p style={{ ...labelStyle, marginBottom: 10 }}>Invite Link · expires in 7 days</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              readOnly value={invite.inviteUrl}
              style={{ ...inputStyle, fontSize: 11, flex: 1 }}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={copy}
              style={{
                fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
                padding: "8px 14px", borderRadius: 8, border: "none",
                background: copied ? "var(--bs-green, #1f4d3a)" : "var(--ink)",
                color: copied ? "#fff" : "var(--brass)", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>

          {form.email && !emailSent && (
            <>
              <button
                onClick={sendEmail}
                disabled={sending}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%", fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
                  padding: "11px 18px", borderRadius: 8, border: "none",
                  background: "var(--ink)", color: "var(--brass)",
                  cursor: sending ? "wait" : "pointer", opacity: sending ? 0.6 : 1,
                  boxSizing: "border-box",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 5l7 5 7-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                {sending ? "Sending…" : `Send Invite to ${form.email}`}
              </button>
              {emailError && (
                <p style={{ fontSize: 11, color: "var(--burgundy)", marginTop: 8, fontFamily: "var(--font-dm-mono, monospace)" }}>
                  {emailError}
                </p>
              )}
            </>
          )}
          {emailSent && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(31,77,58,0.15)", border: "1px solid rgba(31,77,58,0.3)" }}>
              <span style={{ fontSize: 14 }}>✓</span>
              <p style={{ fontSize: 12, color: "var(--bs-green, #1f4d3a)", margin: 0, fontFamily: "var(--font-dm-mono, monospace)" }}>
                Invite email sent to {form.email}
              </p>
            </div>
          )}
          {!form.email && (
            <p style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-dm-mono, monospace)" }}>
              No email provided — copy the link above and send it manually.
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/admin/users" style={{
            fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
            padding: "9px 20px", borderRadius: 8,
            background: "var(--ink)", color: "var(--brass)",
            textDecoration: "none", display: "inline-flex", alignItems: "center",
          }}>
            Back to Users
          </Link>
          <button
            onClick={() => { setInvite(null); setForm({ name: "", username: "", email: "", role: "club_admin", clubSlugs: [] }); }}
            style={{
              fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
              padding: "9px 20px", borderRadius: 8,
              border: "1px solid var(--rule)", background: "none",
              color: "var(--ink-2)", cursor: "pointer",
            }}
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: Create form ───────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 480 }}>
      <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        <Link href="/admin" style={{ color: "inherit", textDecoration: "none" }}>Settings</Link>
        {" / "}
        <Link href="/admin/users" style={{ color: "inherit", textDecoration: "none" }}>Users</Link>
        {" / "}New
      </p>
      <h1 className="bs-heading" style={{ fontSize: 24, marginBottom: 6 }}>Invite Admin</h1>
      <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 24 }}>
        Fill in their details and we&apos;ll generate an invite link. They&apos;ll set their own password when they click it.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="bs-card" style={{ padding: "20px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 16 }}>

          <Field label="Full Name">
            <input
              type="text" autoFocus value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              style={inputStyle} placeholder="e.g. Tina Dupont"
            />
          </Field>

          <Field label="Username" hint="Auto-filled from name — edit if needed">
            <input
              type="text" required value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              style={inputStyle} placeholder="tina-dupont"
            />
          </Field>

          <Field label="Email Address" hint="Used to pre-fill the invite email. Optional but recommended.">
            <input
              type="email" value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              style={inputStyle} placeholder="tina@example.com"
            />
          </Field>

          <div>
            <label style={labelStyle}>Access Level</label>
            <div style={{ display: "flex", gap: 8 }}>
              {([["club_admin", "Club Admin"], ["super_admin", "Super Admin"]] as const).map(([val, label]) => (
                <button
                  key={val} type="button"
                  onClick={() => setForm((p) => ({ ...p, role: val }))}
                  style={{
                    padding: "7px 18px", borderRadius: 7, fontSize: 12,
                    fontFamily: "var(--font-dm-mono, monospace)", cursor: "pointer",
                    border: form.role === val ? "none" : "1px solid var(--rule)",
                    background: form.role === val ? (val === "super_admin" ? "var(--burgundy)" : "var(--ink)") : "var(--paper)",
                    color: form.role === val ? "#fff" : "var(--ink-3)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.role === "super_admin" && (
              <p style={{ fontSize: 10, color: "var(--burgundy)", marginTop: 6, fontFamily: "var(--font-dm-mono, monospace)" }}>
                Super admins can see all clubs, manage users, and change settings.
              </p>
            )}
          </div>
        </div>

        {form.role === "club_admin" && (
          <div className="bs-card" style={{ overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule)" }}>
              <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Assigned Clubs
              </p>
            </div>
            {CLUBS.map((club) => (
              <label key={club.slug} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--rule)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.clubSlugs.includes(club.slug)}
                  onChange={() => toggleClub(club.slug)}
                  style={{ accentColor: "var(--brass)" }}
                />
                <span style={{ fontSize: 18 }}>{club.flag}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{club.name}</div>
                  <div className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{club.city} · {club.currency.toUpperCase()}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(139,26,26,0.07)", border: "1px solid rgba(139,26,26,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--burgundy)" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving} style={{
            fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
            padding: "9px 20px", borderRadius: 8, border: "none",
            background: "var(--ink)", color: "var(--brass)", cursor: "pointer",
            opacity: saving ? 0.6 : 1,
          }}>
            {saving ? "Creating…" : "Create & Get Invite Link"}
          </button>
          <Link href="/admin/users" style={{
            fontFamily: "var(--font-dm-mono, monospace)", fontSize: 12,
            padding: "9px 20px", borderRadius: 8,
            border: "1px solid var(--rule)", color: "var(--ink-2)",
            textDecoration: "none", display: "inline-flex", alignItems: "center",
          }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
