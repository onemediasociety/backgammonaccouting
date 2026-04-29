/** @type {import('next').NextConfig} */
const nextConfig = {
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
