"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PhotoInput, PhotoDocument } from "@/lib/admin/photo-input";
import { photoTags } from "@/lib/vrchat-photos";
import { IMAGE_ACCEPT } from "@/lib/media";
import { uploadImage } from "@/lib/admin/upload-client";
import styles from "../admin.module.css";
type Photo = PhotoInput & Partial<Omit<PhotoDocument, keyof PhotoInput>>;
export function PhotoEditor({
  initial,
  csrfToken,
}: {
  initial: Photo;
  csrfToken: string;
}) {
  const [photo, setPhoto] = useState(initial),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => {
      if (dirty || busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, busy]);
  function update(change: Partial<Photo>) {
    setPhoto((current) => ({ ...current, ...change }));
    setDirty(true);
    setMessage("");
  }
  async function upload(files: File[]) {
    if (lock.current || !files.length) return;
    if (files.length !== 1) {
      setError("한 사진 항목에 이미지 한 장을 선택하십시오.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("사진을 업로드하고 있습니다.");
    try {
      const result = await uploadImage(files[0], csrfToken);
      update({
        src: result.url,
        width: result.width,
        height: result.height,
        title: photo.title || files[0].name.replace(/\.[^.]+$/, ""),
      });
      setMessage(
        "사진을 추가했습니다. 초안 저장 또는 저장 후 공개를 누르십시오.",
      );
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "업로드에 실패했습니다.",
      );
      setMessage("");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function send(
    url: string,
    method: string,
    body: unknown,
  ): Promise<PhotoDocument> {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({
      error: "서버 응답을 확인하지 못했습니다. 입력 내용은 유지됩니다.",
    }));
    if (!response.ok) throw new Error(result.error || "요청에 실패했습니다.");
    return result;
  }
  async function persist(action: "save" | "publish" | "unpublish") {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let result = await send(
        photo.id ? `/api/admin/photos/${photo.id}` : "/api/admin/photos",
        photo.id ? "PUT" : "POST",
        photo,
      );
      setPhoto(result);
      setDirty(false);
      window.history.replaceState(null, "", `/admin/photos/${result.id}`);
      if (action !== "save") {
        result = await send(
          `/api/admin/photos/${result.id}/${action}`,
          "POST",
          { version: result.version },
        );
        setPhoto(result);
      }
      setMessage(
        action === "save"
          ? "초안을 저장했습니다. 공개 사진은 변경되지 않았습니다."
          : action === "publish"
            ? "사진을 공개했습니다. VRChat 사진 페이지에서 확인할 수 있습니다."
            : "공개를 중지했습니다. 초안은 유지됩니다.",
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "저장에 실패했습니다. 입력 내용은 유지됩니다.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const position = photo.position
    .split(" ")
    .map((value) => Number.parseInt(value));
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>UNDERY · VRCHAT</p>
          <h1>{initial.id ? "사진 편집" : "사진 추가"}</h1>
          <p>
            초안은 관리자만 볼 수 있습니다. 공개할 때 두 VRChat 화면에
            반영됩니다.
          </p>
        </div>
        <Link
          href="/admin/photos"
          onClick={(event) => {
            if (
              (dirty || busy) &&
              !window.confirm(
                "저장하지 않은 변경 내용이 있습니다. 목록으로 이동하시겠습니까?",
              )
            )
              event.preventDefault();
          }}
        >
          사진 목록
        </Link>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void persist("save");
        }}
      >
        <fieldset disabled={busy}>
          <div
            className={styles.dropZone}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void upload(Array.from(event.dataTransfer.files));
            }}
          >
            <label className={styles.field}>
              사진 파일 추가·교체
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={(event) => {
                  void upload(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
            </label>
            <p className={styles.muted}>
              여기에 사진을 드래그할 수 있습니다. PNG·JPEG·WebP, 20 MiB 이하.
              업로드할 때 최대 4096px WebP로 변환합니다.
            </p>
            {photo.src && (
              // eslint-disable-next-line @next/next/no-img-element -- Private drafts bypass the shared image optimizer.
              <img
                className={styles.photoPreview}
                src={photo.src}
                alt={photo.description || photo.title}
              />
            )}
          </div>
          <section className={styles.panel}>
            <label className={styles.field}>
              제목
              <input
                required
                maxLength={120}
                value={photo.title}
                onChange={(event) => update({ title: event.target.value })}
              />
            </label>
            <label className={styles.field}>
              사진 설명
              <input
                maxLength={500}
                value={photo.description}
                onChange={(event) =>
                  update({ description: event.target.value })
                }
              />
            </label>
            <div className={styles.grid}>
              <label className={styles.field}>
                촬영 월
                <input
                  type="month"
                  value={photo.month ?? ""}
                  onChange={(event) =>
                    update({ month: event.target.value || null })
                  }
                />
                <small>확인된 월만 입력합니다. 비워둘 수 있습니다.</small>
              </label>
              <label className={styles.field}>
                표시 순서
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={photo.order}
                  onChange={(event) =>
                    update({ order: Number(event.target.value) })
                  }
                />
                <small>작은 숫자가 먼저 표시됩니다.</small>
              </label>
            </div>
            <fieldset>
              <legend>태그</legend>
              <div className={styles.actions}>
                {photoTags.map((tag) => (
                  <label className={styles.checkRow} key={tag}>
                    <input
                      type="checkbox"
                      checked={photo.tags.includes(tag)}
                      onChange={(event) =>
                        update({
                          tags: event.target.checked
                            ? [...photo.tags, tag]
                            : photo.tags.filter((item) => item !== tag),
                        })
                      }
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={photo.showOnHome}
                onChange={(event) =>
                  update({ showOnHome: event.target.checked })
                }
              />
              VRChat 메인에도 표시
            </label>
            <p className={styles.muted}>
              메인은 표시 순서 기준 최대 6장입니다. 전체 공개 사진은 ‘사진 더
              보기’에 표시됩니다.
            </p>
            <div className={styles.grid}>
              {["가로", "세로"].map((label, index) => (
                <label className={styles.field} key={label}>
                  {label} 중심 {position[index]}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={position[index]}
                    onChange={(event) => {
                      const next = [...position];
                      next[index] = Number(event.target.value);
                      update({ position: `${next[0]}% ${next[1]}%` });
                    }}
                  />
                </label>
              ))}
            </div>
            {photo.src && (
              // eslint-disable-next-line @next/next/no-img-element -- Private drafts bypass the shared image optimizer.
              <img
                className={styles.photoThumbnail}
                src={photo.src}
                alt="사진 목록에서 보이는 위치"
                style={{
                  objectPosition: photo.position,
                  width: 240,
                  height: 180,
                }}
              />
            )}
          </section>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          {message && (
            <p role="status" className={styles.status}>
              {message}
            </p>
          )}
          <div className={`${styles.actions} ${styles.sticky}`}>
            <button type="submit">{busy ? "처리 중…" : "초안 저장"}</button>
            <button
              type="button"
              className={styles.primary}
              onClick={() => void persist("publish")}
            >
              저장 후 공개
            </button>
            {photo.publicStatus === "PUBLISHED" && (
              <button type="button" onClick={() => void persist("unpublish")}>
                저장 후 공개 중지
              </button>
            )}
            <a
              href="/game/vrchat/photo"
              target="_blank"
              rel="noopener noreferrer"
            >
              공개 사진 확인
            </a>
          </div>
        </fieldset>
      </form>
    </main>
  );
}
