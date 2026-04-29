/** @type {import('next').NextConfig} */
const nextConfig = {
  // Include the data directory in the serverless function bundle
  outputFileTracingIncludes: {
    "/api/cash": ["./data/**/*"],
    "/api/export": ["./data/**/*"],
    "/": ["./data/**/*"],
    "/clubs/[slug]": ["./data/**/*"],
  },
};

export default nextConfig;
