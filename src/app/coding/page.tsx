import { pageMetadata } from "@/lib/metadata";
import {
  filterCodingPosts,
  getCodingCategory,
  getCodingPosts,
  normalizeCodingQuery,
} from "@/lib/coding";
import { CodingIndex } from "./coding-index";

export const metadata = pageMetadata(
  "Coding",
  "기술에 대한 기록 검색, 여기에! 배우고 경험한 개발 기록을 모읍니다.",
  "/coding",
);

export default async function CodingPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const query = normalizeCodingQuery(params.q);
  const category = getCodingCategory(params.category);
  const posts = await getCodingPosts();
  const results = filterCodingPosts(posts, { query, category: category?.id });
  return (
    <CodingIndex
      posts={posts}
      results={results}
      query={query}
      category={category}
    />
  );
}
