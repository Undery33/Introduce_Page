"use client";
import { useRef, useState } from "react";
import { MarkdownContent } from "@/components/markdown-content";
import { bodyBlocks, imageMarkdown } from "@/lib/markdown-blocks";
import { IMAGE_ACCEPT } from "@/lib/media";
import { uploadImage } from "@/lib/admin/upload-client";
import styles from "./admin.module.css";

export function MarkdownEditor({
  value,
  disabled,
  onChange,
  csrfToken,
  onBusy,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  csrfToken: string;
  onBusy: (busy: boolean) => void;
}) {
  const [raw, setRaw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const active = useRef({ index: 0, start: 0, end: 0 });
  const uploadLock = useRef(false);
  const blocks = raw ? [{ kind: "text" as const, value }] : bodyBlocks(value);
  function changeBlock(index: number, text: string) {
    onChange(
      blocks.map((block, i) => (i === index ? text : block.value)).join(""),
    );
  }
  function insert(text: string, target = active.current) {
    const block = blocks[target.index];
    if (!block || block.kind !== "text") {
      onChange(value + "\n\n" + text + "\n\n");
      return;
    }
    const start = Math.min(target.start, block.value.length),
      end = Math.min(target.end, block.value.length);
    changeBlock(
      target.index,
      block.value.slice(0, start) + text + block.value.slice(end),
    );
  }
  async function upload(files: File[], target = active.current) {
    if (!files.length || disabled || uploadLock.current) return;
    if (files.length > 10) {
      setError("한 번에 최대 10장까지 추가할 수 있습니다.");
      return;
    }
    uploadLock.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    const added: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setStatus(`이미지 업로드 ${i + 1}/${files.length}`);
        const image = await uploadImage(files[i], csrfToken);
        added.push(
          imageMarkdown(image.url, files[i].name.replace(/\.[^.]+$/, "")),
        );
      }
      setStatus("이미지를 본문에 추가했습니다. 초안을 저장하십시오.");
    } catch (failure) {
      setStatus("");
      setError(
        (failure instanceof Error
          ? failure.message
          : "업로드에 실패했습니다.") +
          (added.length ? " 완료된 이미지는 본문에 유지됩니다." : ""),
      );
    } finally {
      if (added.length) insert("\n\n" + added.join("\n\n") + "\n\n", target);
      uploadLock.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <div
      className={styles.bodyEditor}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        void upload(Array.from(event.dataTransfer.files), {
          index: blocks.length - 1,
          start: blocks.at(-1)!.value.length,
          end: blocks.at(-1)!.value.length,
        });
      }}
    >
      <div className={styles.actions}>
        <label className={styles.button}>
          이미지 추가
          <input
            className={styles.fileInput}
            aria-label="본문 이미지 파일 선택"
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            disabled={busy}
            onChange={(event) => {
              void upload(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => insert("\n```bash\n명령어\n```\n")}
        >
          코드 블록
        </button>
        <button
          type="button"
          onClick={() => insert("[링크 이름](https://example.com)")}
        >
          링크
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("공개 이미지 주소를 입력합니다.");
            if (url) insert("\n\n" + imageMarkdown(url) + "\n\n");
          }}
        >
          이미지 주소
        </button>
        <button
          type="button"
          aria-pressed={raw}
          onClick={() => {
            setRaw(!raw);
            active.current = { index: 0, start: 0, end: 0 };
          }}
        >
          {raw ? "이미지 포함 편집" : "Markdown 원문"}
        </button>
      </div>
      <p className={styles.muted}>
        본문에 사진을 드래그하거나 붙여넣습니다. PNG·JPEG·WebP, 한 장당 20 MiB
        이하.
      </p>
      {blocks.map((block, index) =>
        block.kind === "image" ? (
          <figure className={styles.imageBlock} key={index}>
            <MarkdownContent source={imageMarkdown(block.url, block.alt)} />
            <label className={styles.field}>
              사진 설명
              <input
                aria-label={`본문 사진 ${index + 1} 설명`}
                value={block.alt}
                onChange={(event) =>
                  changeBlock(
                    index,
                    imageMarkdown(block.url, event.target.value) + "\n",
                  )
                }
              />
            </label>
            <button type="button" onClick={() => changeBlock(index, "")}>
              본문에서 이미지 제거
            </button>
          </figure>
        ) : (
          <label className={styles.field} key={index}>
            <span>{index === 0 ? "본문" : "이어서 작성"}</span>
            <textarea
              aria-label={index === 0 ? "본문" : `이어서 작성 ${index + 1}`}
              value={block.value}
              rows={Math.min(
                16,
                Math.max(3, block.value.split("\n").length + 1),
              )}
              maxLength={100000}
              spellCheck={false}
              onSelect={(event) => {
                const area = event.currentTarget;
                active.current = {
                  index,
                  start: area.selectionStart,
                  end: area.selectionEnd,
                };
              }}
              onFocus={(event) => {
                active.current = {
                  index,
                  start: event.currentTarget.selectionStart,
                  end: event.currentTarget.selectionEnd,
                };
              }}
              onChange={(event) => changeBlock(index, event.target.value)}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void upload(Array.from(event.dataTransfer.files), {
                  index,
                  start: event.currentTarget.selectionStart,
                  end: event.currentTarget.selectionEnd,
                });
              }}
              onPaste={(event) => {
                const files = Array.from(event.clipboardData.files);
                if (files.length) {
                  event.preventDefault();
                  void upload(files, {
                    index,
                    start: event.currentTarget.selectionStart,
                    end: event.currentTarget.selectionEnd,
                  });
                }
              }}
            />
          </label>
        ),
      )}
      {status && (
        <p role="status" className={styles.status}>
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
