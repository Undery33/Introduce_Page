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
  if (!date) return null;

  return (
    <span className={`${styles.timestamp} ${compact ? styles.compact : ""}`}>
      <time
        dateTime={post.updatedAt}
        aria-label={`${post.isExample ? "예시 날짜 · " : ""}마지막 업데이트 ${date}`}
      >
        {date}
      </time>
    </span>
  );
}
