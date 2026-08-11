import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Profile photos are limited to 5 MB by the client and server. Leave room
    // for Server Action multipart encoding so a valid 5 MB image is accepted.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
