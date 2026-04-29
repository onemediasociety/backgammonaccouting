/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/api/cash": ["./data/**/*"],
    "/api/expenses": ["./data/**/*"],
    "/api/export": ["./data/**/*"],
    "/api/export/qbo": ["./data/**/*"],
    "/": ["./data/**/*"],
    "/clubs/[slug]": ["./data/**/*"],
    "/reports": ["./data/**/*"],
  },
};

export default nextConfig;
