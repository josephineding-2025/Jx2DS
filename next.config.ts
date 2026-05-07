import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "q8ptjfxn-3000.asse.devtunnels.ms", // your tunnel domain
      ],
    },
  },
};

export default nextConfig;
