import Link from "next/link";
import {
  codingListHref,
  filterCodingPosts,
  getCodingCategory,
  type CodingPost,
} from "@/lib/coding";
import { CodingIcon } from "./coding-icons";
import { CodingEmptyState, CodingShell } from "./coding-shell";
import styles from "./coding.module.css";

export function CodingCard({
  post,
  compact = false,
}: {
  post: CodingPost;
  compact?: boolean;
}) {
  const category = getCodingCategory(post.category);
  return (
    <Link
      href={`/coding/${encodeURIComponent(post.slug)}`}
      className={`${styles.card} ${compact ? styles.compactCard : ""}`}
    >
      <div className={styles.cardTop}>
        <span>{category?.label}</span>
        <CodingIcon name={post.icon} />
      </div>
      <h3>{post.title}</h3>
      {!compact && <p>{post.description}</p>}
      <div className={styles.cardBottom}>
        <time dateTime={post.updatedAt}>
          {formatCodingDate(post.updatedAt)}
        </time>
        <CodingIcon name="arrow" />
      </div>
    </Link>
  );
}

export function formatCodingDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Seoul",
      }).format(date);
}

export function CodingIndex({
  posts,
  results,
  query,
  category,
}: {
  posts: readonly CodingPost[];
  results: readonly CodingPost[];
  query: string;
  category?: ReturnType<typeof getCodingCategory>;
}) {
  const recent = filterCodingPosts(posts, {}).slice(0, 4);
  return (
    <CodingShell category={category?.id}>
      <div className={styles.indexContent}>
        {!category && (
          <section className={styles.recent} aria-labelledby="recent-heading">
            <div className={styles.sectionLabel}>
              <h2 id="recent-heading">최근 업데이트</h2>
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
            <h1 id="coding-heading">
              {category?.label ?? (
                <>
                  기술에 대한 기록 검색, <span>여기에!</span>
                </>
              )}
            </h1>
            <form
              className={styles.search}
              action="/coding"
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
              <input
                id="coding-search"
                name="q"
                type="search"
                maxLength={100}
                defaultValue={query}
                key={`${category?.id ?? "home"}:${query}`}
                placeholder="어떤 기술이 궁금한가요?"
                autoComplete="off"
              />
              <button type="submit" aria-label="검색">
                <CodingIcon name="search" />
              </button>
            </form>
          </div>
          {(query || results.length > 0) && (
            <div className={styles.resultSummary}>
              <p>
                {query ? (
                  <>
                    “<strong>{query}</strong>” 검색 결과
                  </>
                ) : (
                  "전체 기록"
                )}{" "}
                <span>{results.length}</span>
              </p>
              {query && results.length > 0 && (
                <Link href={codingListHref({ category: category?.id })}>
                  검색어 지우기 ×
                </Link>
              )}
            </div>
          )}
          {results.length ? (
            <div className={styles.cardGrid}>
              {results.map((post) => (
                <CodingCard key={post.slug} post={post} />
              ))}
            </div>
          ) : (
            <CodingEmptyState
              kind={query ? "search" : "empty"}
              query={query}
              category={category?.id}
              noPosts={posts.length === 0}
            />
          )}
        </section>
      </div>
    </CodingShell>
  );
}
