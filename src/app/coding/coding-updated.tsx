import type { CodingPost } from "@/lib/coding";
import styles from "./coding-updated.module.css";

export function formatCodingDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}.${part("month")}.${part("day")}`;
}

export function CodingUpdated({
  post,
  compact = false,
}: {
  post: Pick<CodingPost, "updatedAt" | "isExample">;
  compact?: boolean;
}) {
  const date = formatCodingDate(post.updatedAt);

  return (
    <span className={`${styles.timestamp} ${compact ? styles.compact : ""}`}>
      <span className={styles.label}>
        <span>{compact ? "업데이트" : "마지막 업데이트"}</span>
        {post.isExample && (
          <span className={styles.exampleLabel}>예시 날짜</span>
        )}
      </span>
      {date ? (
        <time dateTime={post.updatedAt}>{date}</time>
      ) : (
        <span className={styles.unavailable}>날짜 미정</span>
      )}
    </span>
  );
}
