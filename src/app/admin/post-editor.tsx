"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarkdownContent } from "@/components/markdown-content";
import { codingCategories } from "@/lib/coding";
import type { EditorDocument, PostInput } from "@/lib/admin/post-input";
import styles from "./admin.module.css";

type Document = PostInput & Partial<Omit<EditorDocument, keyof PostInput>>;
export function PostEditor({
  initial,
  csrfToken,
}: {
  initial: Document;
  csrfToken: string;
}) {
  const [document, setDocument] = useState<Document>(initial);
  const [tagText, setTagText] = useState(initial.tags.join(", "));
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);
  function update(change: Partial<Document>) {
    setDocument((current) => ({ ...current, ...change }));
    setDirty(true);
    setMessage("");
  }
  async function send(
    url: string,
    method: string,
    body: unknown,
  ): Promise<EditorDocument> {
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
    if (!response.ok)
      throw new Error(result.error || "요청을 완료하지 못했습니다.");
    return result;
  }
  async function persist(action: "save" | "publish" | "unpublish") {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let result: EditorDocument;
      if (action === "unpublish" && document.id && document.version) {
        result = await send(
          `/api/admin/posts/${document.id}/unpublish`,
          "POST",
          { version: document.version },
        );
        // Unpublishing must not throw away unsaved editor text.
        setDocument((current) => ({
          ...current,
          version: result.version,
          publishedVersion: result.publishedVersion,
          publicStatus: result.publicStatus,
        }));
        setMessage(
          "공개를 중지했습니다. 저장하지 않은 편집 내용은 그대로 유지됩니다.",
        );
        return;
      }
      const payload = {
        ...document,
        tags: tagText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
      result = await send(
        document.id ? `/api/admin/posts/${document.id}` : "/api/admin/posts",
        document.id ? "PUT" : "POST",
        payload,
      );
      setDocument(result);
      setTagText(result.tags.join(", "));
      setDirty(false);
      // Keep the editor mounted and do not navigate away before publication.
      window.history.replaceState(null, "", `/admin/posts/${result.id}`);
      if (action === "publish") {
        result = await send(`/api/admin/posts/${result.id}/publish`, "POST", {
          version: result.version,
        });
        setDocument(result);
        setMessage("발행했습니다. Coding에서 공개 글을 확인할 수 있습니다.");
      } else setMessage("초안을 저장했습니다. 공개본은 변경되지 않았습니다.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "저장하지 못했습니다. 입력 내용은 유지됩니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  function moveSection(index: number, direction: number) {
    const sections = [...document.sections];
    [sections[index], sections[index + direction]] = [
      sections[index + direction],
      sections[index],
    ];
    update({ sections });
  }
  function insertText(index: number, value: string) {
    const area = window.document.getElementById(
      `body-${index}`,
    ) as HTMLTextAreaElement | null;
    const section = document.sections[index];
    const start = area?.selectionStart ?? section.markdown.length;
    const end = area?.selectionEnd ?? start;
    const sections = document.sections.map((item, i) =>
      i === index
        ? {
            ...item,
            markdown:
              section.markdown.slice(0, start) +
              value +
              section.markdown.slice(end),
          }
        : item,
    );
    update({ sections });
    area?.focus();
  }
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>UNDERY · ADMIN</p>
          <h1>{initial.id ? "글 편집" : "새 글 작성"}</h1>
          <p className={styles.muted}>
            {dirty
              ? "저장하지 않은 변경 사항이 있습니다."
              : document.id
                ? "저장된 초안입니다."
                : "제목과 본문을 입력한 뒤 초안을 저장하십시오."}
          </p>
        </div>
        <Link
          href="/admin"
          onClick={(event) => {
            if (
              dirty &&
              !window.confirm(
                "저장하지 않은 변경 사항을 두고 목록으로 이동하시겠습니까?",
              )
            )
              event.preventDefault();
          }}
        >
          글 목록
        </Link>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void persist("save");
        }}
      >
        <fieldset
          disabled={busy}
          style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
        >
          <section className={styles.panel} aria-label="글 정보">
            <label className={styles.field}>
              제목
              <input
                required
                maxLength={120}
                value={document.title}
                onChange={(event) => update({ title: event.target.value })}
              />
            </label>
            <label className={styles.field}>
              요약
              <input
                maxLength={300}
                value={document.description}
                onChange={(event) =>
                  update({ description: event.target.value })
                }
              />
            </label>
            <div className={styles.grid}>
              <label className={styles.field}>
                분류
                <select
                  value={document.category}
                  onChange={(event) =>
                    update({
                      category: event.target.value as PostInput["category"],
                    })
                  }
                >
                  {codingCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                아이콘
                <select
                  value={document.icon}
                  onChange={(event) =>
                    update({ icon: event.target.value as PostInput["icon"] })
                  }
                >
                  {[
                    ["code", "코드"],
                    ["server", "서버"],
                    ["globe", "네트워크"],
                    ["ubuntu", "Ubuntu"],
                    ["rocky", "Rocky Linux"],
                  ].map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={styles.field}>
              글 주소
              <input
                required
                maxLength={80}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                readOnly={Boolean(document.postId)}
                value={document.slug}
                onChange={(event) => update({ slug: event.target.value })}
              />
              <small>
                /coding/{document.slug} · 첫 발행 후 주소가 고정됩니다.
              </small>
            </label>
            <label className={styles.field}>
              태그
              <input
                value={tagText}
                onChange={(event) => {
                  setTagText(event.target.value);
                  setDirty(true);
                }}
              />
              <small>쉼표로 구분합니다. 태그당 30자·최대 12개입니다.</small>
            </label>
          </section>
          <div className={styles.actions}>
            <button
              type="button"
              aria-pressed={preview}
              onClick={() => setPreview(!preview)}
            >
              {preview ? "편집으로" : "본문 미리보기"}
            </button>
            <p className={styles.muted}>
              Markdown · 제목, 목록, 표, 링크, 이미지 주소, 코드 블록을
              지원합니다.
            </p>
          </div>
          {preview ? (
            <section
              className={`${styles.panel} ${styles.preview}`}
              aria-label="본문 미리보기"
            >
              <h2>{document.title || "제목 없음"}</h2>
              <p>{document.description}</p>
              {document.sections.map((section, index) => (
                <section key={section.id}>
                  <h2>
                    {index + 1}. {section.title}
                  </h2>
                  <MarkdownContent source={section.markdown} />
                </section>
              ))}
            </section>
          ) : (
            document.sections.map((section, index) => (
              <section
                className={styles.panel}
                key={section.id}
                aria-label={`${index + 1}번 챕터`}
              >
                <div className={styles.header}>
                  <h2>챕터 {index + 1}</h2>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveSection(index, -1)}
                    >
                      위로
                    </button>
                    <button
                      type="button"
                      disabled={index === document.sections.length - 1}
                      onClick={() => moveSection(index, 1)}
                    >
                      아래로
                    </button>
                    <button
                      type="button"
                      disabled={document.sections.length === 1}
                      onClick={() => {
                        if (
                          !section.markdown ||
                          window.confirm(
                            "이 챕터를 삭제하시겠습니까? 저장 전까지 공개본에는 영향을 주지 않습니다.",
                          )
                        )
                          update({
                            sections: document.sections.filter(
                              (_, i) => i !== index,
                            ),
                          });
                      }}
                    >
                      챕터 삭제
                    </button>
                  </div>
                </div>
                <label className={styles.field}>
                  챕터 제목
                  <input
                    required
                    maxLength={120}
                    value={section.title}
                    onChange={(event) =>
                      update({
                        sections: document.sections.map((item, i) =>
                          i === index
                            ? { ...item, title: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
                <div className={styles.actions}>
                  <button
                    type="button"
                    onClick={() =>
                      insertText(index, "\n```bash\n명령어\n```\n")
                    }
                  >
                    코드 블록
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertText(index, "[링크 이름](https://example.com)")
                    }
                  >
                    링크
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertText(
                        index,
                        "![사진 설명](https://example.com/image.webp)",
                      )
                    }
                  >
                    이미지 주소
                  </button>
                </div>
                <label className={styles.field}>
                  본문
                  <textarea
                    id={`body-${index}`}
                    value={section.markdown}
                    maxLength={100000}
                    spellCheck={false}
                    onChange={(event) =>
                      update({
                        sections: document.sections.map((item, i) =>
                          i === index
                            ? { ...item, markdown: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
              </section>
            ))
          )}
          {!preview && (
            <button
              type="button"
              disabled={document.sections.length >= 40}
              onClick={() =>
                update({
                  sections: [
                    ...document.sections,
                    { id: crypto.randomUUID(), title: "새 챕터", markdown: "" },
                  ],
                })
              }
            >
              챕터 추가
            </button>
          )}
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
              저장 후 발행
            </button>
            {document.publicStatus === "PUBLISHED" && (
              <>
                <button type="button" onClick={() => void persist("unpublish")}>
                  공개 중지
                </button>
                <a
                  href={`/coding/${document.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  공개 글 확인
                </a>
              </>
            )}
          </div>
        </fieldset>
      </form>
    </main>
  );
}
