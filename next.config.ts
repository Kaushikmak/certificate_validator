import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js not to bundle native C++ modules
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;