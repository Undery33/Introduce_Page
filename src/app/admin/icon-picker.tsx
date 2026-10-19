"use client";
import { useRef, useState } from "react";
import { IMAGE_ACCEPT, builtInIcons, type IconOption } from "@/lib/media";
import { uploadImage } from "@/lib/admin/upload-client";
import { CodingIcon } from "@/app/coding/coding-icons";
import type { PostInput } from "@/lib/admin/post-input";
import styles from "./admin.module.css";
export function IconPicker({
  value,
  onChange,
  initial,
  csrfToken,
  onBusy,
}: {
  value: PostInput["icon"];
  onChange: (value: PostInput["icon"]) => void;
  initial: IconOption[];
  csrfToken: string;
  onBusy: (busy: boolean) => void;
}) {
  const [icons, setIcons] = useState(initial);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function add(file: File) {
    if (lock.current) return;
    if (!label.trim()) {
      setError("아이콘 이름을 먼저 입력하십시오.");
      return;
    }
    lock.current = true;
    onBusy(true);
    setError("");
    try {
      const image = await uploadImage(file, csrfToken);
      const response = await fetch("/api/admin/icons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ label, url: image.url }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "아이콘 등록에 실패했습니다.");
      setIcons((current) => [...current, result]);
      onChange(result.value);
      setLabel("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "아이콘 등록에 실패했습니다.",
      );
    } finally {
      lock.current = false;
      onBusy(false);
    }
  }
  return (
    <div>
      <label className={styles.field}>
        아이콘
        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value as PostInput["icon"])
          }
        >
          {[...builtInIcons, ...icons].map((icon, index) => (
            <option key={`${icon.value}-${index}`} value={icon.value}>
              {icon.label}
            </option>
          ))}
        </select>
      </label>
      <span className={styles.iconPreview}>
        <CodingIcon name={value} />
      </span>
      <details>
        <summary>사용자 아이콘 추가</summary>
        <label className={styles.field}>
          아이콘 이름
          <input
            value={label}
            maxLength={40}
            placeholder="예: Docker"
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          아이콘 이미지
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void add(file);
              event.target.value = "";
            }}
          />
        </label>
        <p className={styles.muted}>
          등록한 아이콘은 다른 글에서도 선택할 수 있습니다.
        </p>
      </details>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
