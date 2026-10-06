import Link from "next/link";
import { codingListHref, type CodingPost } from "@/lib/coding";
import { CodingShell } from "./coding-shell";
import { CodingIcon } from "./coding-icons";
import { formatCodingDate } from "./coding-index";
import styles from "./coding.module.css";

export function CodingArticle({
  post,
  sectionId,
}: {
  post: CodingPost;
  sectionId?: string;
}) {
  const requestedIndex = post.sections.findIndex(
    (section) => section.id === sectionId,
  );
  const index = requestedIndex < 0 ? 0 : requestedIndex;
  const section = post.sections[index];
  const previous = post.sections[index - 1];
  const next = post.sections[index + 1];
  const chapterHref = (id: string) =>
    `/coding/${encodeURIComponent(post.slug)}?${new URLSearchParams({ section: id })}`;
  return (
    <CodingShell category={post.category}>
      <article className={styles.article}>
        <Link
          className={styles.backLink}
          href={codingListHref({ category: post.category })}
        >
          <CodingIcon name="arrow" />
          목록으로
        </Link>
        <header className={styles.articleHeader}>
          <CodingIcon name={post.icon} />
          <div>
            <div className={styles.articleTitle}>
              <h1>{post.title}</h1>
              <p>{post.description}</p>
            </div>
            <div className={styles.articleMeta}>
              <span>
                작성{" "}
                <time dateTime={post.publishedAt}>
                  {formatCodingDate(post.publishedAt)}
                </time>
              </span>
              {post.updatedAt !== post.publishedAt && (
                <span>
                  수정{" "}
                  <time dateTime={post.updatedAt}>
                    {formatCodingDate(post.updatedAt)}
                  </time>
                </span>
              )}
              {post.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          </div>
        </header>
        {section ? (
          <section
            className={styles.articleBody}
            aria-labelledby="chapter-heading"
          >
            <div className={styles.chapterLabel}>
              CHAPTER {String(index + 1).padStart(2, "0")} /{" "}
              {String(post.sections.length).padStart(2, "0")}
            </div>
            <h2 id="chapter-heading">
              {index + 1}. {section.title}
            </h2>
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex}>{paragraph}</p>
            ))}
            {section.code && (
              <div className={styles.codeBlock}>
                <div>{section.code.language}</div>
                <pre tabIndex={0} aria-label={`${section.code.language} 코드`}>
                  <code>{section.code.value}</code>
                </pre>
              </div>
            )}
          </section>
        ) : (
          <section className={styles.articleBody}>
            <h2>아직 등록된 본문이 없습니다.</h2>
            <p>본문을 준비하고 있습니다.</p>
          </section>
        )}
        {(previous || next) && (
          <nav className={styles.chapterNav} aria-label="글 목차 이동">
            {previous ? (
              <Link href={chapterHref(previous.id)}>
                <strong>
                  <CodingIcon name="arrow" className={styles.previousArrow} />
                  이전
                </strong>
                <span>
                  {index}. {previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={chapterHref(next.id)} className={styles.nextChapter}>
                <strong>
                  다음
                  <CodingIcon name="arrow" />
                </strong>
                <span>
                  {index + 2}. {next.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </article>
    </CodingShell>
  );
}
