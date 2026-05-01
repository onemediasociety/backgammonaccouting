/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep dynamic-page RSC payloads in the client router cache for 2 minutes.
  // Navigating between pages reuses the cached render instead of re-fetching Stripe.
  experimental: {
    staleTimes: {
      dynamic: 1800,
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
