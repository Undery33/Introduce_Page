import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { sections, type Section } from "@/lib/sections";

export function SectionShell({
  section,
  children,
}: {
  section: Section;
  children: React.ReactNode;
}) {
  const data = sections[section];
  return (
    <div className={`site-shell theme-${section}`}>
      <a className="skip-link" href="#content">
        본문으로 건너뛰기
      </a>
      <header className="site-header">
        <Link
          className="brand"
          href={data.path}
          aria-label={`${data.name} 시작 페이지`}
        >
          <BrandLogo alt="" />
          <span className="brand-section">{data.name}</span>
        </Link>
        <nav aria-label={`${data.name} 메뉴`}>
          {data.navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="content" className="main-content">
        {children}
      </main>
      <footer className="site-footer">
        <div>
          <Link
            href={data.path}
            className="footer-brand"
            aria-label={`UNDERY / ${data.name.toUpperCase()} 시작 페이지`}
          >
            <BrandLogo size={28} alt="" />
            <span>UNDERY / {data.name.toUpperCase()}</span>
          </Link>
          <p>하나씩, 나의 속도로 쌓아가는 공간.</p>
        </div>
        <div className="footer-links">
          {section === "coding" && (
            <a
              href="https://github.com/Undery33"
              target="_blank"
              rel="noreferrer"
            >
              GitHub ↗
            </a>
          )}
          <Link href="/privacy">데이터 처리 안내 ↗</Link>
        </div>
      </footer>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  symbol = "↗",
}: {
  title: string;
  children: React.ReactNode;
  symbol?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-symbol" aria-hidden="true">
        {symbol}
      </span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function SectionHeading({
  number,
  title,
  aside,
}: {
  number: string;
  title: string;
  aside?: string;
}) {
  return (
    <div className="section-heading">
      <h2>
        <span className="section-number">{number}</span>
        {title}
      </h2>
      {aside && <span className="small-label">{aside}</span>}
    </div>
  );
}

export function SectionNotFound({ section }: { section: Section }) {
  return (
    <div className="section-error">
      <span className="eyebrow">404 / NOT FOUND</span>
      <h1>이 페이지를 찾을 수 없습니다.</h1>
      <p>주소가 바뀌었거나 아직 공개되지 않은 페이지입니다.</p>
      <Link className="text-link" href={sections[section].path}>
        {sections[section].name} 시작 페이지로 ↗
      </Link>
    </div>
  );
}
