import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Website photos are uploaded through a server action after being shrunk on
  // the phone (usually well under 1 MB); this leaves room for big ones.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
