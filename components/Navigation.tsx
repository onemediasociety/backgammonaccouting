import Link from "next/link";
import { CLUBS } from "@/lib/clubs";
import { getSession } from "@/lib/get-session";
import LogoutButton from "./LogoutButton";

export default async function Navigation() {
  const session = await getSession();
  const isSuper = session?.role === "super_admin";
  const isClubAdmin = session?.role === "club_admin";

  const visibleClubs = isClubAdmin
    ? CLUBS.filter((c) => session.clubSlugs.includes(c.slug))
    : CLUBS;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-5 h-14 overflow-x-auto">
          {/* Logo — only super admin goes to /; club admins go to their club */}
          <Link
            href={isClubAdmin && session.clubSlugs[0] ? `/clubs/${session.clubSlugs[0]}` : "/"}
            className="flex items-center gap-2 text-sm font-bold text-gray-900 whitespace-nowrap shrink-0"
          >
            🎲 <span>Accounting</span>
          </Link>
          <div className="h-5 w-px bg-gray-200 shrink-0" />

          {/* Club links */}
          {visibleClubs.map((club) => (
            <Link
              key={club.slug}
              href={`/clubs/${club.slug}`}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap shrink-0"
            >
              <span>{club.flag}</span>
              <span>{club.city}</span>
            </Link>
          ))}

          {/* Super-admin-only links */}
          {isSuper && (
            <>
              <div className="h-5 w-px bg-gray-200 shrink-0" />
              <Link
                href="/reports"
                className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap shrink-0"
              >
                📊 P&amp;L
              </Link>
              <Link
                href="/payouts"
                className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap shrink-0"
              >
                💳 Payouts
              </Link>
              <Link
                href="/members"
                className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap shrink-0"
              >
                👥 Members
              </Link>
              <Link
                href="/admin/users"
                className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap shrink-0 font-medium"
              >
                ⚙️ Admin
              </Link>
            </>
          )}

          {/* Session info + logout */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {session && (
              <span className="text-xs text-gray-400">
                {session.username}
                {isSuper && (
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-xs font-medium">
                    super admin
                  </span>
                )}
              </span>
            )}
            <LogoutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
