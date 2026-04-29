// Server-only module — do not import from client components.
import { CLUBS, type Club } from "./clubs";
import { getExtraClubs } from "./clubs-store";

export function getAllClubs(): Club[] {
  const extra = getExtraClubs()
    .filter((e) => !CLUBS.some((c) => c.slug === e.slug))
    .map((e): Club => ({
      slug: e.slug,
      name: e.name,
      city: e.city,
      country: e.country,
      currency: e.currency,
      flag: e.flag,
      color: "gray",
      accentBg: "bg-gray-50",
      accentText: "text-gray-700",
      matchFn: () => false,
    }));
  return [...CLUBS, ...extra];
}
