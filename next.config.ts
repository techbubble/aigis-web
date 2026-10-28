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
  serverExternalPackages: ["unpdf", "xlsx", "exifr", "sharp"],
  // Bundled sample datasets are read from disk by the store at runtime.
  outputFileTracingIncludes: {
    "/explore/[id]": ["./public/samples/**/dataset.json"],
    "/api/datasets/[id]": ["./public/samples/**/dataset.json"],
    "/api/chat": ["./public/samples/**/dataset.json"],
    "/api/samples/[id]": ["./public/samples/**/dataset.json"],
  },
};

export default nextConfig;
