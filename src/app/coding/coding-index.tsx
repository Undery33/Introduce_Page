"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  codingListHref,
  filterCodingPosts,
  getCodingCategory,
  getCodingTags,
  normalizeCodingQuery,
  normalizeCodingTags,
  type CodingCategory,
  type CodingPost,
} from "@/lib/coding";
import {
  changeCodingSearchInput,
  createCodingSearchState,
  syncCodingSearchUrl,
} from "@/lib/coding-search-state";
import { CodingIcon } from "./coding-icons";
import { CodingEmptyState, CodingShell } from "./coding-shell";
import { CodingUpdated } from "./coding-updated";
import styles from "./coding.module.css";

export function CodingCard({
  post,
  compact = false,
  category,
  query,
  selectedTags = [],
}: {
  post: CodingPost;
  compact?: boolean;
  category?: CodingCategory;
  query?: string;
  selectedTags?: readonly string[];
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
              href={codingListHref({
                category,
                query,
                tags: [...selectedTags, tag],
              })}
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
  const urlSearch = searchParams.toString();
  const [searchState, setSearchState] = useState(() =>
    createCodingSearchState(urlSearch),
  );
  // Restore external navigation without letting a delayed URL acknowledgment
  // overwrite the locally controlled value. The input element stays mounted.
  if (searchState.urlSearch !== urlSearch) {
    setSearchState(syncCodingSearchUrl(searchState, urlSearch));
  }
  const query = normalizeCodingQuery(searchState.value);
  const tags = normalizeCodingTags(searchParams.getAll("tag"));
  const category = getCodingCategory(searchParams.get("category") ?? "");
  const representativeTags = getCodingTags(posts, { category: category?.id });
  const availableTags = normalizeCodingTags([...representativeTags, ...tags]);
  const results = filterCodingPosts(posts, {
    query,
    tags,
    category: category?.id,
  });
  const recent = filterCodingPosts(posts, {}).slice(0, 4);

  function updateQuery(value: string, composing = searchState.composing) {
    const next = changeCodingSearchInput(searchState, value, composing);
    setSearchState(next);
    if (next.pendingSearches !== searchState.pendingSearches) {
      const suffix = next.pendingSearches.at(-1);
      window.history.replaceState(
        null,
        "",
        suffix ? `/coding?${suffix}` : "/coding",
      );
    }
  }

  function toggleTag(tag: string) {
    const selected = tags.some(
      (value) => value.toLowerCase() === tag.toLowerCase(),
    );
    const nextTags = selected
      ? tags.filter((value) => value.toLowerCase() !== tag.toLowerCase())
      : [...tags, tag];
    window.history.pushState(
      null,
      "",
      codingListHref({ category: category?.id, query, tags: nextTags }),
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
                    href="/coding"
                    aria-label={`${category.label} · Coding HOME으로`}
                    title="Coding HOME으로 돌아가기"
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
              {tags.map((tag) => (
                <input key={tag} type="hidden" name="tag" value={tag} />
              ))}
              <input
                id="coding-search"
                name="q"
                type="search"
                maxLength={100}
                value={searchState.value}
                onChange={(event) =>
                  updateQuery(
                    event.target.value,
                    searchState.composing ||
                      (event.nativeEvent as InputEvent).isComposing,
                  )
                }
                onCompositionStart={() =>
                  setSearchState((state) => ({ ...state, composing: true }))
                }
                onCompositionEnd={(event) =>
                  updateQuery(event.currentTarget.value, false)
                }
                placeholder="어떤 기술이 궁금한가요?"
                autoComplete="off"
              />
              <button type="submit" aria-label="검색">
                <CodingIcon name="search" />
              </button>
            </form>
          </div>
          {availableTags.length > 0 && (
            <div className={styles.tagFilters}>
              <div
                className={styles.tagOptions}
                role="group"
                aria-label="태그 필터, 여러 개 선택 가능"
              >
                {availableTags.map((tag) => {
                  const selected = tags.some(
                    (value) => value.toLowerCase() === tag.toLowerCase(),
                  );
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleTag(tag)}
                    >
                      <span aria-hidden="true">{selected ? "✓" : "#"}</span>
                      {tag}
                    </button>
                  );
                })}
                {tags.length > 0 && (
                  <Link
                    className={styles.clearTags}
                    href={codingListHref({ category: category?.id, query })}
                    scroll={false}
                  >
                    선택 해제 ×
                  </Link>
                )}
              </div>
            </div>
          )}
          {(query || tags.length > 0 || results.length > 0) && (
            <div className={styles.resultSummary}>
              <p role="status" aria-live="polite" aria-atomic="true">
                {query ? (
                  <>
                    “<strong>{query}</strong>” 검색 결과
                  </>
                ) : tags.length > 0 ? (
                  "태그 검색 결과"
                ) : (
                  "전체 기록"
                )}{" "}
                <span>{results.length}</span>
              </p>
              {query && results.length > 0 && (
                <Link
                  href={codingListHref({ category: category?.id, tags })}
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
                  selectedTags={tags}
                />
              ))}
            </div>
          ) : (
            <CodingEmptyState
              kind={query || tags.length > 0 ? "search" : "empty"}
              query={query}
              tags={tags}
              category={category?.id}
              noPosts={posts.length === 0}
            />
          )}
        </section>
      </div>
    </CodingShell>
  );
}
