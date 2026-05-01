/** @type {import('next').NextConfig} */
const nextConfig = {
  // staleTimes.dynamic is left at the default (0) so date-filter navigation always
  // triggers a fresh server render. Stripe data is cached server-side via
  // unstable_cache (30-min TTL) so cross-page navigation is still fast without
  // stale client-side renders blocking the date filter.
  experimental: {
    staleTimes: {
      static: 1800,
    },
  },
  outputFileTracingIncludes: {
    "/api/cash": ["./data/**/*"],
    "/api/expenses": ["./data/**/*"],
    "/api/export": ["./data/**/*"],
    "/api/export/qbo": ["./data/**/*"],
    "/api/admin/users": ["./data/**/*"],
    "/api/admin/users/[id]": ["./data/**/*"],
    "/api/admin/splits": ["./data/**/*"],
    "/": ["./data/**/*"],
    "/clubs/[slug]": ["./data/**/*"],
    "/reports": ["./data/**/*"],
    "/admin/users": ["./data/**/*"],
    "/admin/splits": ["./data/**/*"],
  },
};

export default nextConfig;
