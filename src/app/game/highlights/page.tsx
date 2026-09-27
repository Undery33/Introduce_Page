import Link from "next/link";
import { EmptyState } from "@/components/section-shell";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata(
  "하이라이트",
  "기억하고 싶은 플레이를 모으는 영상 기록.",
  "/game/highlights",
);
export default function Highlights() {
  return (
    <>
      <div className="page-heading">
        <Link className="breadcrumb" href="/game">
          Game /
        </Link>
        <span className="eyebrow">MOTION COLLECTION</span>
        <h1>
          HIGHLIGHTS<span className="accent-text">.</span>
        </h1>
        <p>좋았던 플레이는, 한 번 더.</p>
      </div>
      <EmptyState title="아직 공개된 영상이 없습니다." symbol="▷">
        첫 번째 하이라이트를 준비하고 있습니다. 등록된 영상은 자동 재생되지
        않습니다.
      </EmptyState>
    </>
  );
}
