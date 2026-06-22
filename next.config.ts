import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so a stray parent-directory lockfile doesn't
  // mislead Turbopack's root inference.
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bmprbjlwzziwnuquobgb.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
