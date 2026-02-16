const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3001";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${apiBaseUrl}/api/test/:path*`,
      },
    ];
  },
};

export default nextConfig;
