import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/session";
import { listPhotos } from "@/lib/admin/photos";
import styles from "../admin.module.css";
export default async function PhotosPage() {
  await requireAdminPage();
  const photos = await listPhotos();
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>UNDERY · ADMIN</p>
          <h1>VRChat 사진 관리</h1>
          <p>기존 사진과 새 사진의 초안·공개 상태를 관리합니다.</p>
        </div>
        <Link href="/admin">관리자 홈</Link>
      </header>
      <div className={styles.actions}>
        <Link
          className={`${styles.button} ${styles.primary}`}
          href="/admin/photos/new"
        >
          사진 추가
        </Link>
        <Link href="/game/vrchat/photo">공개 사진 보기</Link>
      </div>
      <ul className={styles.list}>
        {photos.map((photo) => (
          <li key={photo.id}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Private media requires session cookies, not the image optimizer. */}
            <img
              className={styles.photoThumbnail}
              src={photo.src}
              alt={photo.description || photo.title}
              loading="lazy"
            />
            <div>
              <h2>
                <Link href={`/admin/photos/${photo.id}`}>{photo.title}</Link>
              </h2>
              <p className={styles.muted}>
                {photo.publicStatus === "PUBLISHED"
                  ? photo.publishedVersion === photo.version
                    ? "공개 중"
                    : "공개 중 · 수정 초안 있음"
                  : "비공개 초안"}{" "}
                · {photo.month ?? "촬영 월 미지정"} · 순서 {photo.order}
              </p>
            </div>
            <Link href={`/admin/photos/${photo.id}`}>편집</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
