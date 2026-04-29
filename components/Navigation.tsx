import Link from "next/link";
import { CLUBS } from "@/lib/clubs";
import LogoutButton from "./LogoutButton";

export default function Navigation() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-5 h-14 overflow-x-auto">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-gray-900 whitespace-nowrap shrink-0"
          >
            🎲 <span>Accounting</span>
          </Link>
          <div className="h-5 w-px bg-gray-200 shrink-0" />

          {/* Clubs */}
          {CLUBS.map((club) => (
            <Link
              key={club.slug}
              href={`/clubs/${club.slug}`}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap shrink-0"
            >
              <span>{club.flag}</span>
              <span>{club.city}</span>
            </Link>
          ))}

          <div className="h-5 w-px bg-gray-200 shrink-0" />

          {/* Reports */}
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

          <div className="ml-auto shrink-0">
            <LogoutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
