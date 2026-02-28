import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["recharts", "d3", "framer-motion", "lucide-react"],
  },
};

export default nextConfig;
