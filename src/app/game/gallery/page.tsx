import Link from "next/link";
import { EmptyState } from "@/components/section-shell";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata(
  "사진첩",
  "스크린샷과 사진으로 남기는 순간.",
  "/game/gallery",
);
export default function Gallery() {
  return (
    <>
      <div className="page-heading">
        <Link className="breadcrumb" href="/game">
          Game /
        </Link>
        <span className="eyebrow">STILL COLLECTION</span>
        <h1>
          GALLERY<span className="accent-text">.</span>
        </h1>
        <p>흘러가는 순간을, 한 장씩.</p>
      </div>
      <EmptyState title="첫 사진을 기다리고 있습니다." symbol="⌗">
        직접 고른 사진과 설명을 확인한 뒤 공개합니다.
      </EmptyState>
    </>
  );
}
