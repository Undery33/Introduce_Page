import type { MetadataRoute } from "next";
import { sections } from "@/lib/sections";
import { siteOrigin } from "@/lib/metadata";
export default function sitemap(): MetadataRoute.Sitemap {
  return sections.game.sitemap.map((path) => ({ url: `${siteOrigin}${path}` }));
}
