import { EmptyState, SectionHeading } from "@/components/section-shell";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata(
  "Whoami",
  "직접 작성하고 확인한 소개와 이야기를 담는 공간.",
  "/whoami",
);
export default function WhoamiPage() {
  return (
    <>
      <section id="intro" className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="status-dot" />A LITTLE ABOUT ME
          </span>
          <h1>
            HELLO,
            <br />
            I’M <span className="accent-text">UNDERY.</span>
          </h1>
          <p>
            어떤 사람인지, 무엇을 할 수 있는지.
            <br />
            나의 언어로 천천히 채워가는 소개.
          </p>
          <a className="text-link" href="#profile">
            조금 더 알아보기 ↓
          </a>
        </div>
        <div className="hero-art profile-art" aria-hidden="true">
          <span className="art-caption">A WORK IN PROGRESS</span>
          <span className="profile-monogram">U.</span>
          <span className="art-foot">MY OWN PACE. MY OWN WORDS.</span>
        </div>
      </section>
      <div className="intro-note">
        <span className="small-label">01 / INTRODUCTION</span>
        <p>
          소개 글을 준비하고 있습니다.
          <br />
          <span>직접 작성하고 확인한 이야기로 이 공간을 채울 예정입니다.</span>
        </p>
      </div>
      <section id="profile" className="content-section">
        <SectionHeading number="02" title="인적사항과 성격" aside="PROFILE" />
        <div className="profile-grid">
          <div className="profile-name">
            <span className="small-label">활동명</span>
            <strong>Undery</strong>
          </div>
          <p className="muted-copy">
            아직 공개한 상세 프로필이 없습니다.
            <br />
            성격과 소통 방식은 직접 소개할 예정입니다.
          </p>
        </div>
      </section>
      <section id="skills" className="content-section">
        <SectionHeading
          number="03"
          title="할 수 있는 것"
          aside="CAPABILITIES"
        />
        <EmptyState title="경험을 정리하고 있습니다." symbol="+">
          직접 해본 작업과 설명할 수 있는 경험을 담겠습니다.
        </EmptyState>
      </section>
      <section id="strengths" className="content-section">
        <SectionHeading number="04" title="장점과 강점" aside="STRENGTHS" />
        <EmptyState title="나만의 강점을 돌아보고 있습니다." symbol="✳">
          실제 행동과 경험을 바탕으로 소개하겠습니다.
        </EmptyState>
      </section>
      <section id="comments" className="content-section">
        <SectionHeading number="05" title="한마디 남기기" aside="GUEST NOTES" />
        <div className="comments-intro">
          <h3>짧은 인사도 반갑습니다.</h3>
          <p>
            댓글 기능은 준비 중입니다. 아직 입력한 내용을 받거나 저장하지
            않습니다.
          </p>
        </div>
        <fieldset className="comment-preview" disabled>
          <legend className="sr-only">댓글 기능 준비 중</legend>
          <label htmlFor="nickname">
            닉네임 <span>2–20자</span>
          </label>
          <input
            id="nickname"
            placeholder="어떤 이름으로 불러드릴까요?"
            autoComplete="off"
          />
          <label htmlFor="comment">
            남기고 싶은 이야기 <span>최대 1,000자</span>
          </label>
          <textarea
            id="comment"
            rows={4}
            placeholder="댓글 기능이 열리면 이야기를 남길 수 있습니다."
          />
          <div className="comment-bottom">
            <p>
              공개 시 닉네임과 댓글 내용이 표시됩니다.
              <br />
              개인정보는 남기지 마세요.
            </p>
            <button type="button" disabled>
              댓글 준비 중 ↗
            </button>
          </div>
        </fieldset>
      </section>
    </>
  );
}
