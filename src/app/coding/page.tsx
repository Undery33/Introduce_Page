import { pageMetadata } from "@/lib/metadata";
import { getCodingPosts } from "@/lib/coding-store";
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
    tag?: string | string[];
  }>;
}) {
  // Resolve the request before rendering URL-driven client filters on the server.
  await searchParams;
  const posts = await getCodingPosts();
  return <CodingIndex posts={posts} />;
}
