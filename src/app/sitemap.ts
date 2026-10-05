import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: new URL("/", siteOrigin).href }];
}
