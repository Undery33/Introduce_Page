import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "데이터 처리 안내 — UNDERY",
  alternates: { canonical: "/privacy" },
};
export default function PrivacyPage() {
  return (
    <main className="bare-page prose">
      <span className="eyebrow">UNDERY / PRIVACY</span>
      <h1>데이터 처리 안내</h1>
      <p className="lead">현재 사이트는 기반 구축 단계입니다.</p>
      <h2>현재 제공하는 기능</h2>
      <p>
        댓글 작성, 관리자 로그인, 파일 업로드, SNS 삽입은 아직 활성화되지
        않았습니다. 화면의 댓글 입력란은 비활성화되어 있으며, 애플리케이션은
        닉네임과 댓글을 수집하거나 저장하지 않습니다.
      </p>
      <h2>접속 기록</h2>
      <p>
        페이지 요청은 웹서버를 거치므로 서버 설정에 따라 접속 기록이 남을 수
        있습니다. 사이트 공개 전에 실제 기록 항목과 보관 기간을 점검하고 이
        안내에 반영합니다.
      </p>
      <h2>외부 링크</h2>
      <p>
        GitHub 등 외부 사이트 링크를 누르면 해당 서비스로 이동합니다. 현재 외부
        SNS 위젯, 방문 분석, 광고 서비스는 불러오지 않습니다.
      </p>
      <h2>기능 공개 전 안내</h2>
      <p>
        댓글 기능을 열기 전에 닉네임·본문의 공개 범위, 삭제코드 사용 방법, 문의
        경로, 로그와 백업의 실제 보관 기간을 안내합니다. 이 페이지는 아직
        확정되지 않은 운영 정책을 보장하지 않습니다.
      </p>
    </main>
  );
}
