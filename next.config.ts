import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The investor folder moved from /investors; keep old links working.
  async redirects() {
    return [
      { source: "/investors/:path*", destination: "/investor/:path*", permanent: true },
      { source: "/investor/saft", destination: "/investor/safe", permanent: true },
    ];
  },
  serverExternalPackages: ["unpdf", "xlsx", "exifr", "sharp", "@react-pdf/renderer"],
  // Bundled sample datasets are read from disk by the store at runtime.
  outputFileTracingIncludes: {
    "/explore/[id]": ["./public/samples/**/dataset.json"],
    "/api/datasets/[id]": ["./public/samples/**/dataset.json"],
    "/api/chat": ["./public/samples/**/dataset.json"],
    "/api/samples/[id]": ["./public/samples/**/dataset.json"],
  },
};

export default nextConfig;
