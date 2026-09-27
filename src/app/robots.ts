import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  // Keep the foundation out of search until the public-launch checks pass.
  return { rules: { userAgent: "*", disallow: "/" } };
}
