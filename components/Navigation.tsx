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

  return (
    <SidebarClient
      clubs={visibleClubs.map((c) => ({ slug: c.slug, city: c.city, flag: c.flag }))}
      username={session?.username}
      role={session?.role}
      isSuper={isSuper}
    />
  );
}
