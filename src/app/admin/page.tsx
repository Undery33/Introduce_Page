import Link from "next/link";
import { authConfiguration } from "@/lib/admin/security";
import { adminSession } from "@/lib/admin/session";
import { getDatabase } from "@/lib/db";
import styles from "./admin.module.css";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; page?: string }>;
}) {
  const search = await searchParams;
  const configured = Boolean(authConfiguration());
  let session: Awaited<ReturnType<typeof adminSession>> = null;
  let unavailable = false;
  try {
    session = await adminSession();
  } catch {
    unavailable = true;
  }
  if (!session)
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p>UNDERY</p>
            <h1>관리자 로그인</h1>
            <p>글을 작성하고 공개 상태를 관리합니다.</p>
          </div>
          <Link href="/coding">Coding으로</Link>
        </header>
        <section className={styles.panel}>
          {!configured ? (
            <>
              <h2>로그인 설정이 필요합니다.</h2>
              <p>관리자 인증과 데이터베이스 연결을 준비하고 있습니다.</p>
            </>
          ) : unavailable ? (
            <p role="alert" className={styles.error}>
              저장소에 연결하지 못했습니다. 잠시 후 다시 시도하십시오.
            </p>
          ) : (
            <>
              <p>허용된 GitHub 관리자 계정으로 로그인합니다.</p>
              {search.error && (
                <p role="alert" className={styles.error}>
                  로그인이 완료되지 않았습니다. 허용된 계정인지 확인하고 다시
                  시도하십시오.
                </p>
              )}
              <form action="/api/auth/github" method="post">
                <button className={styles.primary}>GitHub로 로그인</button>
              </form>
            </>
          )}
        </section>
      </main>
    );
  const page = Math.max(
    1,
    Math.min(100000, Number.parseInt(search.page ?? "1", 10) || 1),
  );
  const drafts = await getDatabase().codingPostDraft.findMany({
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 21,
    skip: (page - 1) * 20,
    select: {
      id: true,
      title: true,
      slug: true,
      version: true,
      publishedVersion: true,
      updatedAt: true,
      post: { select: { status: true } },
    },
  });
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>UNDERY · ADMIN</p>
          <h1>글 관리</h1>
          <p>초안을 저장하고 준비된 글을 발행합니다.</p>
        </div>
        <div className={styles.actions}>
          <Link href="/coding">공개 글 보기</Link>
          <form action="/api/auth/logout" method="post">
            <input type="hidden" name="csrfToken" value={session.csrfToken} />
            <button>로그아웃</button>
          </form>
        </div>
      </header>
      <Link
        className={`${styles.button} ${styles.primary}`}
        href="/admin/posts/new"
      >
        새 글 작성
      </Link>{" "}
      <Link className={styles.button} href="/admin/photos">
        VRChat 사진 관리
      </Link>
      <section className={styles.panel}>
        {drafts.length === 0 ? (
          <p>아직 작성한 글이 없습니다.</p>
        ) : (
          <ul className={styles.list}>
            {drafts.slice(0, 20).map((draft) => (
              <li key={draft.id}>
                <div>
                  <h2>
                    <Link href={`/admin/posts/${draft.id}`}>{draft.title}</Link>
                  </h2>
                  <p className={styles.muted}>
                    {draft.post?.status === "PUBLISHED"
                      ? draft.publishedVersion === draft.version
                        ? "공개 중"
                        : "공개 중 · 수정 초안 있음"
                      : "비공개 초안"}{" "}
                    ·{" "}
                    {draft.updatedAt.toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                    })}
                  </p>
                </div>
                <Link href={`/admin/posts/${draft.id}`}>편집</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <nav className={styles.actions} aria-label="글 목록 페이지">
        {page > 1 && <Link href={`/admin?page=${page - 1}`}>이전</Link>}
        {drafts.length > 20 && (
          <Link href={`/admin?page=${page + 1}`}>다음</Link>
        )}
      </nav>
    </main>
  );
}
