import { notFound } from "next/navigation";
import { getCodingPosts } from "@/lib/coding";
import { pageMetadata } from "@/lib/metadata";
import { CodingArticle } from "../coding-article";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ section?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = (await getCodingPosts()).find((item) => item.slug === slug);
  if (!post) notFound();
  return pageMetadata(
    post.title,
    post.description,
    `/coding/${encodeURIComponent(post.slug)}`,
  );
}

export default async function CodingPostPage({
  params,
  searchParams,
}: PageProps) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const post = (await getCodingPosts()).find((item) => item.slug === slug);
  if (!post) notFound();
  const sectionId = Array.isArray(search.section)
    ? search.section[0]
    : search.section;
  return <CodingArticle post={post} sectionId={sectionId} />;
}
