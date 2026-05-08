import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/ai_agent",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
