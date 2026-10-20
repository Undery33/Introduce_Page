import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/metadata";
import { getCodingPosts } from "@/lib/coding-store";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getCodingPosts();
  return [
    { url: `${siteOrigin}/coding` },
    ...posts
      .filter((post) => !post.isExample)
      .map((post) => ({
        url: `${siteOrigin}/coding/${post.slug}`,
        lastModified: post.updatedAt,
      })),
  ];
}
