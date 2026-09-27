import Link from "next/link";
import { EmptyState, SectionHeading } from "@/components/section-shell";
import { categories } from "@/lib/sections";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata(
  "Coding",
  "코드와 시스템을 이해하며 남기는 개발 기록.",
  "/coding",
);

export default async function CodingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const category = categories.find((item) => item.id === params.category);
  return (
    <>
      <section className="hero coding-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="status-dot" />
            DEVELOPMENT JOURNAL
          </span>
          <h1>
            THINK.
            <br />
            BUILD.
            <br />
            <span className="accent-text">RECORD.</span>
          </h1>
          <p>
            만들고, 이해하고, 기록합니다.
            <br />한 줄의 코드에서 하나의 시스템까지.
          </p>
          <a className="text-link" href="#records">
            기록 살펴보기 <span>↓</span>
          </a>
        </div>
        <div className="hero-art code-art" aria-hidden="true">
          <span className="art-caption">NOTES ON THE PROCESS</span>
          <span className="code-bracket">&#123;</span>
          <div className="art-lines">
            <i />
            <i />
            <i />
            <i />
          </div>
          <span className="art-end">&#125;</span>
          <span className="art-foot">LEARN · BUILD · REPEAT</span>
        </div>
      </section>
      <section id="categories" className="content-section">
        <SectionHeading
          number="01"
          title="관심을 따라 쌓는 기록"
          aside="FOUR CATEGORIES"
        />
        <div className="category-grid">
          {categories.map((item) => (
            <Link
              className={`category-card ${category?.id === item.id ? "selected" : ""}`}
              key={item.id}
              href={`/coding?category=${item.id}#records`}
            >
              <span className="card-number">
                {item.number}
                <span>↗</span>
              </span>
              <h3>{item.label}</h3>
              <p>{item.description}</p>
              <span className="category-count">0개의 기록</span>
            </Link>
          ))}
        </div>
      </section>
      <section id="records" className="content-section">
        <SectionHeading
          number="02"
          title={category?.label || "모든 기록"}
          aside="JOURNAL / 00"
        />
        <form className="search-form" action="/coding" role="search">
          <label className="sr-only" htmlFor="search">
            기록 제목 검색
          </label>
          <span aria-hidden="true">⌕</span>
          <input
            id="search"
            name="q"
            placeholder="궁금한 기록을 찾아보세요"
            maxLength={100}
            defaultValue={query}
          />
          {category && (
            <input type="hidden" name="category" value={category.id} />
          )}
          <button type="submit">검색 ↗</button>
        </form>
        {(query || category) && (
          <div className="filter-summary">
            <span>
              {query ? `“${query}” 검색 결과` : `${category?.label} 기록`}
            </span>
            <Link href="/coding#records">필터 초기화 ×</Link>
          </div>
        )}
        <EmptyState
          title={
            query
              ? "검색 결과가 없습니다."
              : "첫 번째 기록을 준비하고 있습니다."
          }
          symbol="↳"
        >
          {query
            ? "다른 검색어로 다시 찾아보세요."
            : "직접 배우고 경험한 내용이 이곳에 하나씩 쌓일 예정입니다."}
        </EmptyState>
      </section>
    </>
  );
}
