import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "관리자 — UNDERY",
  robots: { index: false, follow: false },
};
export default function AdminPage() {
  return (
    <main className="bare-page admin-page">
      <span className="eyebrow">UNDERY / ADMIN</span>
      <h1>관리 공간을 준비하고 있습니다.</h1>
      <p>
        관리자 인증이 연결되기 전에는 콘텐츠 조회·수정·업로드를 제공하지
        않습니다.
      </p>
      <div className="notice">로그인 기능은 아직 활성화되지 않았습니다.</div>
    </main>
  );
}
