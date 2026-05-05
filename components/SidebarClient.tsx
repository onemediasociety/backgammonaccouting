"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LogoutButton from "./LogoutButton";

interface Club {
  slug: string;
  city: string;
  flag: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

interface Props {
  clubs: Club[];
  username?: string;
  role?: string;
  isSuper?: boolean;
}

// SVG icons matching the design
const Icons = {
  overview: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/></svg>,
  ledger:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 6h6M5 8.5h4M5 11h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  stripe:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 7h14" stroke="currentColor" strokeWidth="1.3"/><path d="M4 10.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  payouts:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  reports:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 13V9l3-3 3 2 4-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  members:  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M12 4v5M14.5 6.5h-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  admin:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
};

export default function SidebarClient({ clubs, username, role, isSuper }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const inAdmin = pathname.startsWith("/admin");

  // Which club is "active" — derive from URL
  const clubMatch = pathname.match(/^\/clubs\/([^/]+)/);
  const activeClub = clubMatch ? clubMatch[1] : "all";

  useEffect(() => {
    const saved = localStorage.getItem("bs-sidebar-expanded");
    if (saved !== null) setExpanded(saved === "true");
  }, []);

  function toggleExpanded() {
    setExpanded((v) => {
      localStorage.setItem("bs-sidebar-expanded", String(!v));
      return !v;
    });
  }

  function handleClubSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "all") {
      router.push("/");
    } else {
      router.push(`/clubs/${val}`);
    }
  }

  // Build nav items based on active club
  const baseItems: NavItem[] = [
    { href: "/", label: "Overview", icon: Icons.overview, exact: true },
  ];

  if (activeClub !== "all") {
    baseItems.push(
      { href: `/clubs/${activeClub}`, label: "Ledger", icon: Icons.ledger, exact: true },
      { href: `/clubs/${activeClub}?section=stripe`, label: "Stripe", icon: Icons.stripe },
    );
  }

  // Payouts visible to everyone (super admin sees full view, club admins see their earnings)
  baseItems.push({ href: "/payouts", label: "Payouts", icon: Icons.payouts });
  baseItems.push({ href: "/profile", label: "My Profile", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2 13c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> });

  if (isSuper) {
    baseItems.push(
      { href: "/reports", label: "Reports", icon: Icons.reports },
      { href: "/members", label: "Members", icon: Icons.members },
    );
  }

  const settingsSubItems = [
    { href: "/admin", label: "General", exact: true },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/splits", label: "Splits" },
  ];

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href.split("?")[0];
    return pathname === item.href.split("?")[0] || pathname.startsWith(item.href.split("?")[0] + "/");
  }

  const initials = username ? username.slice(0, 2).toUpperCase() : "BS";
  const roleLabel = role === "super_admin" ? "Society admin" : role === "club_admin" ? "Club admin" : "";

  const sidebarContent = (
    <aside
      className={`bs-sidebar${mobileOpen ? " mobile-open" : ""}`}
      style={{ width: expanded ? "var(--sidebar-w, 220px)" : "var(--sidebar-rail, 64px)" }}
    >
      {/* Logo */}
      <div className="bs-logo-mark">
        <div className="logo-badge">BS</div>
        {expanded && (
          <div className="logo-text">
            <div>Backgammon</div>
            <div className="logo-sub">Society · Accounting</div>
          </div>
        )}
      </div>

      {/* Club switcher */}
      {expanded ? (
        <div style={{ padding: "10px 12px 4px" }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-dm-mono, monospace)", color: "rgba(240,235,226,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 5 }}>
            Club
          </div>
          <select
            value={activeClub}
            onChange={handleClubSwitch}
            style={{
              width: "100%", padding: "7px 10px", borderRadius: 7,
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(240,235,226,0.85)", fontSize: 12,
              fontFamily: "var(--font-dm-mono, monospace)",
              cursor: "pointer", outline: "none", appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='rgba(240,235,226,0.4)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
              paddingRight: 28,
            }}
          >
            <option value="all" disabled={!isSuper} style={{ background: "#1a1611" }}>
              {activeClub === "all" ? "City" : "← All Clubs"}
            </option>
            {clubs.map((c) => (
              <option key={c.slug} value={c.slug} style={{ background: "#1a1611" }}>
                {c.flag} {c.city}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div style={{ padding: "8px", display: "flex", justifyContent: "center" }}>
          <button
            title={activeClub === "all" ? "All clubs" : clubs.find(c => c.slug === activeClub)?.city}
            onClick={() => setExpanded(true)}
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, width: 36, height: 28, cursor: "pointer", fontSize: 13 }}
          >
            {activeClub === "all" ? "🌐" : clubs.find(c => c.slug === activeClub)?.flag ?? "•"}
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="bs-nav" style={{ marginTop: 8 }}>
        {baseItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`bs-nav-item${isActive(item) ? " active" : ""}`}
            title={!expanded ? item.label : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            {expanded && <span className="nav-label">{item.label}</span>}
          </Link>
        ))}

        {/* Settings dropdown — super admin only */}
        {isSuper && (
          <>
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className={`bs-nav-item${inAdmin ? " active" : ""}`}
              title={!expanded ? "Settings" : undefined}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <span className="nav-icon">{Icons.admin}</span>
              {expanded && (
                <>
                  <span className="nav-label" style={{ flex: 1 }}>Settings</span>
                  <svg
                    width="10" height="10" viewBox="0 0 10 10" fill="none"
                    style={{ flexShrink: 0, transition: "transform 180ms", transform: (settingsOpen || inAdmin) ? "rotate(180deg)" : "none", opacity: 0.5 }}
                  >
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>

            {(settingsOpen || inAdmin) && expanded && (
              <div style={{ paddingLeft: 16, paddingBottom: 2 }}>
                {settingsSubItems.map((sub) => {
                  const subActive = sub.exact ? pathname === sub.href : pathname.startsWith(sub.href);
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => setMobileOpen(false)}
                      style={{
                        display: "block", padding: "6px 12px", borderRadius: 6, fontSize: 12,
                        fontFamily: "var(--font-dm-mono, monospace)",
                        color: subActive ? "rgba(240,235,226,0.9)" : "rgba(240,235,226,0.45)",
                        background: subActive ? "rgba(255,255,255,0.09)" : "none",
                        textDecoration: "none", marginBottom: 2,
                        borderLeft: subActive ? "2px solid rgba(184,144,66,0.6)" : "2px solid transparent",
                        transition: "all 150ms",
                      }}
                    >
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="bs-sidebar-footer">
        {username && (
          <div className="bs-user-chip">
            <div className="bs-avatar">{initials}</div>
            {expanded && (
              <div className="bs-user-info">
                <div className="bs-user-name">{username}</div>
                {roleLabel && <div className="bs-user-role">{roleLabel}</div>}
              </div>
            )}
          </div>
        )}
        {username && (
          <button
            title="Refresh Stripe data"
            onClick={async () => {
              setRefreshing(true);
              await fetch("/api/cache/revalidate", { method: "POST" });
              router.refresh();
              setTimeout(() => setRefreshing(false), 1000);
            }}
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6, cursor: refreshing ? "default" : "pointer",
              padding: expanded ? "5px 10px" : "5px 8px",
              color: "rgba(240,235,226,0.45)", fontSize: 11,
              fontFamily: "var(--font-dm-mono, monospace)",
              display: "flex", alignItems: "center", gap: 6,
              opacity: refreshing ? 0.5 : 1,
              whiteSpace: "nowrap", overflow: "hidden",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: refreshing ? "rotate(360deg)" : "none", transition: refreshing ? "transform 0.8s linear" : "none" }}>
              <path d="M10 6a4 4 0 1 1-1.2-2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M10 2v2.5H7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {expanded && (refreshing ? "Refreshing…" : "Refresh data")}
          </button>
        )}
        <LogoutButton compact={!expanded} />
      </div>

      {/* Collapse toggle */}
      <div className="bs-sidebar-toggle">
        <button onClick={toggleExpanded} title={expanded ? "Collapse" : "Expand"}>
          {expanded ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile topbar */}
      <div className="bs-topbar">
        <button className="bs-hamburger" onClick={() => setMobileOpen(true)}>
          <span /><span /><span />
        </button>
        <div style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          background: "linear-gradient(135deg, #b89042 0%, #8a6a2a 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: 12, fontWeight: 700, color: "#fff",
        }}>BS</div>
        <span style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: 14, fontWeight: 600, color: "rgba(240,235,226,0.9)" }}>
          {activeClub !== "all" ? (clubs.find(c => c.slug === activeClub)?.city ?? "Accounting") : "Backgammon Society"}
        </span>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div className="bs-mobile-overlay open" onClick={() => setMobileOpen(false)} />
      )}

      {sidebarContent}
    </>
  );
}
