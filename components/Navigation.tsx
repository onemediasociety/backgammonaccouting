import { CLUBS } from "@/lib/clubs";
import { getSession } from "@/lib/get-session";
import SidebarClient from "./SidebarClient";

export default async function Navigation() {
  const session = await getSession();
  const isSuper = session?.role === "super_admin";
  const isClubAdmin = session?.role === "club_admin";

  const visibleClubs = isClubAdmin
    ? CLUBS.filter((c) => session.clubSlugs.includes(c.slug))
    : CLUBS;

  const items: { href: string; label: string; icon: string; exact?: boolean; section?: string }[] = [];

  if (isSuper) {
    items.push({ href: "/", label: "Dashboard", icon: "◈", exact: true });
  }

  if (visibleClubs.length > 0) {
    items.push(
      ...visibleClubs.map((club) => ({
        href: `/clubs/${club.slug}`,
        label: club.city,
        icon: club.flag,
        section: "Clubs",
      }))
    );
  }

  if (isSuper) {
    items.push(
      { href: "/reports", label: "P&L Report", icon: "▦", section: "Analytics" },
      { href: "/payouts", label: "Payouts", icon: "⬡", section: "Analytics" },
      { href: "/members", label: "Members", icon: "◉", section: "Analytics" },
      { href: "/admin/users", label: "Users", icon: "⊞", section: "Admin" },
      { href: "/admin/splits", label: "Splits", icon: "⊗", section: "Admin" },
    );
  }

  return (
    <SidebarClient
      items={items}
      username={session?.username}
      role={session?.role}
    />
  );
}
