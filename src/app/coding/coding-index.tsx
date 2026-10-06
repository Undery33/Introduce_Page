"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  codingListHref,
  filterCodingPosts,
  getCodingCategory,
  normalizeCodingQuery,
  type CodingCategory,
  type CodingPost,
} from "@/lib/coding";
import { CodingIcon } from "./coding-icons";
import { CodingEmptyState, CodingShell } from "./coding-shell";
import { CodingUpdated } from "./coding-updated";
import styles from "./coding.module.css";

export function CodingCard({
  post,
  compact = false,
  category,
  query,
}: {
  post: CodingPost;
  compact?: boolean;
  category?: CodingCategory;
  query?: string;
}) {
  const postCategory = getCodingCategory(post.category);
  return (
    <article className={`${styles.card} ${compact ? styles.compactCard : ""}`}>
      <Link
        href={`/coding/${encodeURIComponent(post.slug)}`}
        className={styles.cardMain}
        aria-label={post.title}
      >
        <div className={styles.cardTop}>
          <span>{postCategory?.label}</span>
          <div className={styles.cardIcon}>
            <CodingIcon name={post.icon} />
          </div>
        </div>
        <h3>{post.title}</h3>
        {!compact && <p>{post.description}</p>}
      </Link>
      {!compact && post.tags.length > 0 && (
        <div className={styles.cardTags}>
          {post.tags.slice(0, 3).map((tag) => (
            <Link
              key={tag}
              href={codingListHref({ category, query, tag })}
              scroll={false}
              aria-label={`${tag} 태그로 필터링`}
            >
              {tag}
            </Link>
          ))}
        </div>
      )}
      <div className={styles.cardBottom}>
        {post.isExample && !compact && (
          <span className={styles.exampleBadge}>예시 자료</span>
        )}
        <CodingUpdated post={post} compact={compact} />
      </div>
    </article>
  );
}

export function CodingIndex({ posts }: { posts: readonly CodingPost[] }) {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") ?? "";
  const query = normalizeCodingQuery(rawQuery);
  const tag = normalizeCodingQuery(searchParams.get("tag") ?? "");
  const category = getCodingCategory(searchParams.get("category") ?? "");
  const results = filterCodingPosts(posts, {
    query,
    tag,
    category: category?.id,
  });
  const recent = filterCodingPosts(posts, {}).slice(0, 4);

  function updateQuery(value: string) {
    // Keep the raw input (including spaces and Korean composition) in the URL;
    // filtering normalizes it separately, without a round trip or debounce.
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    const suffix = params.toString();
    window.history.replaceState(
      null,
      "",
      suffix ? `/coding?${suffix}` : "/coding",
    );
  }
  return (
    <CodingShell category={category?.id}>
      <div className={styles.indexContent}>
        {!category && (
          <section className={styles.recent} aria-labelledby="recent-heading">
            <div className={styles.sectionLabel}>
              <h2 id="recent-heading">
                최근 업데이트 <span>LATEST NOTES</span>
              </h2>
              <CodingIcon name="clock" />
            </div>
            {recent.length ? (
              <div className={styles.recentGrid}>
                {recent.map((post) => (
                  <CodingCard key={post.slug} post={post} compact />
                ))}
              </div>
            ) : (
              <div className={styles.recentEmpty}>
                <CodingIcon name="clock" />
                <p>
                  새로운 기록이 등록되면 이곳에서 가장 먼저 만나볼 수 있어요.
                </p>
              </div>
            )}
          </section>
        )}
        <section
          className={category ? styles.categoryContent : styles.homeContent}
          aria-labelledby="coding-heading"
        >
          <div className={category ? styles.categoryHeader : styles.homeHeader}>
            <div className={styles.headingGroup}>
              {category && (
                <p className={styles.eyebrow}>DEVELOPMENT JOURNAL</p>
              )}
              <h1 id="coding-heading">
                {category ? (
                  <Link
                    className={styles.headingLink}
                    href="/"
                    aria-label={`${category.label} · 메인 홈페이지로`}
                    title="메인 홈페이지로 돌아가기"
                  >
                    {category.label}
                    <CodingIcon name="arrow" />
                  </Link>
                ) : (
                  <>
                    기술에 대한 기록 검색, <span>여기에!</span>
                  </>
                )}
              </h1>
              {category && (
                <p className={styles.categoryDescription}>
                  {category.description}
                </p>
              )}
            </div>
            <form
              className={styles.search}
              action="/coding"
              onSubmit={(event) => event.preventDefault()}
              role="search"
              aria-label={
                category ? `${category.label} 자료 검색` : "전체 코딩 자료 검색"
              }
            >
              <label className="sr-only" htmlFor="coding-search">
                {category ? `${category.label}에서 검색` : "기술 기록 검색"}
              </label>
              {category && (
                <input type="hidden" name="category" value={category.id} />
              )}
              {tag && <input type="hidden" name="tag" value={tag} />}
              <input
                id="coding-search"
                name="q"
                type="search"
                maxLength={100}
                value={rawQuery}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="어떤 기술이 궁금한가요?"
                autoComplete="off"
              />
              <button type="submit" aria-label="검색">
                <CodingIcon name="search" />
              </button>
            </form>
          </div>
          {tag && (
            <div className={styles.activeTag}>
              <span>
                선택한 태그 <strong>#{tag}</strong>
              </span>
              <Link
                href={codingListHref({ category: category?.id, query })}
                scroll={false}
                aria-label="태그 필터 지우기"
              >
                태그 지우기 <span aria-hidden="true">×</span>
              </Link>
            </div>
          )}
          {(query || tag || results.length > 0) && (
            <div className={styles.resultSummary}>
              <p role="status" aria-live="polite" aria-atomic="true">
                {query ? (
                  <>
                    “<strong>{query}</strong>” 검색 결과
                  </>
                ) : tag ? (
                  "태그 검색 결과"
                ) : (
                  "전체 기록"
                )}{" "}
                <span>{results.length}</span>
              </p>
              {query && results.length > 0 && (
                <Link
                  href={codingListHref({ category: category?.id, tag })}
                  scroll={false}
                >
                  검색어 지우기 ×
                </Link>
              )}
            </div>
          )}
          {results.length ? (
            <div className={styles.cardGrid}>
              {results.map((post) => (
                <CodingCard
                  key={post.slug}
                  post={post}
                  category={category?.id}
                  query={query}
                />
              ))}
            </div>
          ) : (
            <CodingEmptyState
              kind={query || tag ? "search" : "empty"}
              query={query}
              tag={tag}
              category={category?.id}
              noPosts={posts.length === 0}
            />
          )}
        </section>
      </div>
    </CodingShell>
  );
}
