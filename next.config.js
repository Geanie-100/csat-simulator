/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },  // temporary
  eslint: { ignoreDuringBuilds: true }      // temporary
};
module.exports = nextConfig;
