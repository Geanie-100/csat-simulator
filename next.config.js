/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,    // you can remove later
  },
  eslint: {
    ignoreDuringBuilds: true,   // you can remove later
  },
};

module.exports = nextConfig;
