/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/install.sh",
        destination: "/api/v1/edge/install",
      },
      {
        source: "/install.ps1",
        destination: "/api/v1/edge/install.ps1",
      },
      {
        source: "/api/v1/edge/agent.sh",
        destination: "/api/v1/edge/install",
      },
    ];
  },
};

module.exports = nextConfig;
