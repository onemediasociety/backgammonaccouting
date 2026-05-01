"use client";

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  }

  if (compact) {
    return (
      <button
        onClick={handleLogout}
        className="bs-nav-item"
        title="Sign out"
        style={{ marginTop: 2 }}
      >
        <span className="nav-icon">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M5 3H3a1 1 0 00-1 1v7a1 1 0 001 1h2M10 5l3 2.5L10 10M6 7.5h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className="bs-nav-item"
      style={{ marginTop: 2 }}
    >
      <span className="nav-icon">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M5 3H3a1 1 0 00-1 1v7a1 1 0 001 1h2M10 5l3 2.5L10 10M6 7.5h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
      <span className="nav-label" style={{ color: "rgba(240,235,226,0.45)", fontSize: 12 }}>Sign out</span>
    </button>
  );
}
