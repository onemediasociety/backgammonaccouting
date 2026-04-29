"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  section?: string;
}

interface Props {
  items: NavItem[];
  username?: string;
  role?: string;
}

export default function SidebarClient({ items, username, role }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Persist collapse preference
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

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  const initials = username ? username.slice(0, 2).toUpperCase() : "BS";
  const roleLabel = role === "super_admin" ? "Super Admin" : role === "club_admin" ? "Club Admin" : "";

  // Group items by section
  type Section = { label: string | null; items: NavItem[] };
  const sections: Section[] = [];
  for (const item of items) {
    const sectionLabel = item.section ?? null;
    const last = sections[sections.length - 1];
    if (!last || last.label !== sectionLabel) {
      sections.push({ label: sectionLabel, items: [item] });
    } else {
      last.items.push(item);
    }
  }

  const sidebar = (
    <aside
      className={`bs-sidebar${mobileOpen ? " mobile-open" : ""}`}
      style={{ width: expanded ? "var(--sidebar-w, 220px)" : "var(--sidebar-rail, 64px)" }}
    >
      {/* Logo mark */}
      <div className="bs-logo-mark">
        <div className="logo-badge">BS</div>
        {expanded && (
          <div className="logo-text">
            <div>Backgammon</div>
            <div className="logo-sub">Society</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="bs-nav">
        {sections.map((section, si) => (
          <div key={si}>
            {section.label && expanded && (
              <div className="bs-nav-section">
                <span className="bs-nav-section-label">{section.label}</span>
              </div>
            )}
            {!section.label && si > 0 && (
              <div style={{ height: 8 }} />
            )}
            {section.items.map((item) => (
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
          </div>
        ))}
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
        <LogoutButton compact={!expanded} />
      </div>

      {/* Collapse toggle */}
      <div className="bs-sidebar-toggle">
        <button onClick={toggleExpanded} title={expanded ? "Collapse sidebar" : "Expand sidebar"}>
          {expanded ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
        <div className="logo-badge" style={{
          width: 28, height: 28, borderRadius: 6,
          background: "linear-gradient(135deg, #b89042 0%, #8a6a2a 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: 12, fontWeight: 700, color: "#fff",
        }}>
          BS
        </div>
        <span style={{ fontFamily: "var(--font-cormorant, Georgia, serif)", fontSize: 14, fontWeight: 600, color: "rgba(240,235,226,0.9)" }}>
          Accounting
        </span>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="bs-mobile-overlay open"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {sidebar}
    </>
  );
}
