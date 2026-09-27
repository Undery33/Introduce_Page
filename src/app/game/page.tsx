import Link from "next/link";
import { EmptyState, SectionHeading } from "@/components/section-shell";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata(
  "Game",
  "함께 플레이하고 기억할 순간을 모으는 게임 공간.",
  "/game",
);
export default function GamePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="status-dot" />
            PLAY & COLLECT
          </span>
          <h1>
            GOOD GAME.
            <br />
            <span className="accent-text">GREAT</span>
            <br />
            MEMORIES.
          </h1>
          <p>
            함께한 플레이, 남겨두고 싶은 순간.
            <br />
            게임 속 이야기를 모으는 곳.
          </p>
          <Link className="text-link" href="/game/highlights">
            하이라이트 보기 ↗
          </Link>
        </div>
        <div className="hero-art game-art" aria-hidden="true">
          <span className="art-caption">SAVE YOUR FAVORITE MOMENTS</span>
          <span className="play-glyph">▷</span>
          <span className="game-coordinate">PLAY / PAUSE / REMEMBER</span>
          <span className="art-foot">GG. NEXT ROUND?</span>
        </div>
      </section>
      <section className="content-section">
        <SectionHeading
          number="01"
          title="플레이의 조각들"
          aside="COLLECTION"
        />
        <div className="collection-grid">
          <Link className="collection-card" href="/game/highlights">
            <span className="small-label">01 / MOTION</span>
            <span className="collection-symbol" aria-hidden="true">
              ↗
            </span>
            <h2>하이라이트</h2>
            <p>다시 보고 싶은 플레이를 영상으로.</p>
            <span className="text-link">모든 영상 보기 ↗</span>
          </Link>
          <Link className="collection-card gallery-card" href="/game/gallery">
            <span className="small-label">02 / STILL</span>
            <span className="collection-symbol" aria-hidden="true">
              ⌗
            </span>
            <h2>사진첩</h2>
            <p>스크린샷과 사진으로 남기는 순간.</p>
            <span className="text-link">사진첩 열기 ↗</span>
          </Link>
        </div>
      </section>
      <section className="content-section">
        <SectionHeading number="02" title="함께하는 공간" aside="CONNECT" />
        <div className="social-grid">
          {[
            {
              name: "Discord",
              description: "서버와 초대 링크를 준비하고 있습니다.",
            },
            {
              name: "X",
              description: "공개 타임라인 연결을 준비하고 있습니다.",
            },
            {
              name: "Instagram",
              description: "프로필과 게시물 연결을 준비하고 있습니다.",
            },
          ].map((item) => (
            <article className="social-card" key={item.name}>
              <span className="small-label">연결 준비 중</span>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="content-section">
        <SectionHeading number="03" title="플레이하는 게임" />
        <EmptyState title="게임 프로필을 준비하고 있습니다.">
          공개할 게임 ID와 활동 정보를 확인한 뒤 등록합니다.
        </EmptyState>
      </section>
    </>
  );
}
