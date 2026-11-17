import type { MetadataRoute } from "next";

// The investor folder is unlisted: not linked from the site, not indexed.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: ["/investor", "/api/"] }] };
}
