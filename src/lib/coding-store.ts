import type { CodingPost } from "./coding";
import { getDatabase } from "./db";
import { publicCategory } from "./admin/posts";
import { parsePostInput } from "./admin/post-input";

export function isCodingPreviewEnabled(
  environment: { NODE_ENV?: string; CODING_PREVIEW?: string } = process.env,
): boolean {
  return (
    environment.NODE_ENV === "development" && environment.CODING_PREVIEW === "1"
  );
}
export async function getCodingPosts(): Promise<readonly CodingPost[]> {
  if (isCodingPreviewEnabled()) {
    const { codingExamplePosts } = await import("./coding-examples");
    return codingExamplePosts;
  }
  if (!process.env.DATABASE_URL) return [];
  // Only public snapshots are read. Drafts and private metadata never reach UI.
  const posts = await getDatabase().codingPost.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null } },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: {
      slug: true,
      title: true,
      description: true,
      category: true,
      icon: true,
      tags: true,
      sections: true,
      publishedAt: true,
      updatedAt: true,
    },
  });
  return posts.map((post) => {
    const input = parsePostInput({
      ...post,
      category: publicCategory(post.category),
    });
    return {
      ...input,
      sections: input.sections.map((section) => ({
        ...section,
        paragraphs: [],
      })),
      publishedAt: post.publishedAt!.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  });
}
