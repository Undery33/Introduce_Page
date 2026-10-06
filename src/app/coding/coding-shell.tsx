import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import {
  codingCategories,
  codingListHref,
  type CodingCategory,
} from "@/lib/coding";
import { CodingIcon } from "./coding-icons";
import styles from "./coding.module.css";

export function CodingShell({
  children,
  category,
}: {
  children: React.ReactNode;
  category?: CodingCategory;
}) {
  return (
    <div className={styles.shell}>
      <a href="#coding-content" className={styles.skipLink}>
        본문으로 바로가기
      </a>
      <aside className={styles.sidebar}>
        <Link href="/coding" className={styles.brand} aria-label="Coding 홈">
          <BrandLogo size={44} alt="" />
          <span>| Coding</span>
        </Link>
        <nav className={styles.navigation} aria-label="코딩 자료 분류">
          <Link
            href="/coding"
            className={styles.navLink}
            aria-current={!category ? "page" : undefined}
          >
            <span className={styles.navNumber} aria-hidden="true">
              00
            </span>
            HOME
          </Link>
          {codingCategories.map((item, index) => (
            <Link
              key={item.id}
              href={codingListHref({ category: item.id })}
              className={styles.navLink}
              aria-current={category === item.id ? "page" : undefined}
            >
              <span className={styles.navNumber} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
        <a
          className={styles.github}
          href="https://github.com/Undery33/Introduce_Page"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub 저장소 (새 탭)"
        >
          <CodingIcon name="github" />
          <span>GitHub</span>
          <span className={styles.externalArrow} aria-hidden="true">
            ↗
          </span>
        </a>
      </aside>
      <main id="coding-content" tabIndex={-1} className={styles.main}>
        {children}
      </main>
    </div>
  );
}

export function CodingEmptyState({
  kind,
  query,
  category,
  noPosts,
}: {
  kind: "empty" | "search" | "missing";
  query?: string;
  category?: CodingCategory;
  noPosts?: boolean;
}) {
  const Heading = kind === "missing" ? "h1" : "h2";
  return (
    <div className={styles.emptyState} role="status">
      <div className={styles.emptyIcon}>
        <CodingIcon name={kind === "search" ? "search" : "file"} />
      </div>
      <Heading>
        {kind === "search"
          ? "검색 결과가 없습니다."
          : kind === "missing"
            ? "자료를 찾을 수 없습니다."
            : "아직 등록된 자료가 없습니다."}
      </Heading>
      <p>
        {kind === "search"
          ? noPosts
            ? "아직 등록된 자료가 없어 검색할 수 없습니다. 새로운 기록을 기다려 주세요."
            : `“${query}”에 해당하는 기록이 없습니다. 다른 검색어로 다시 찾아보세요.`
          : kind === "missing"
            ? "주소를 다시 확인하거나 전체 기록에서 찾아보세요."
            : "배우고 경험한 내용을 정리하고 있어요. 곧 새로운 기록으로 만나요."}
      </p>
      {kind === "search" && (
        <Link
          className={styles.emptyAction}
          href={codingListHref({ category })}
        >
          검색어 지우기 <span aria-hidden="true">×</span>
        </Link>
      )}
      {kind === "missing" && (
        <Link className={styles.emptyAction} href="/coding">
          전체 기록 보기 <CodingIcon name="arrow" />
        </Link>
      )}
    </div>
  );
}
