"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  archivePhotos,
  filterPhotos,
  getPhotoMonths,
  photoTags,
} from "@/lib/vrchat-photos";
import styles from "./photo-gallery.module.css";

const months = getPhotoMonths(archivePhotos);
const hasUndatedPhotos = archivePhotos.some((photo) => photo.month === null);

export function PhotoGallery() {
  const [month, setMonth] = useState("");
  const [tag, setTag] = useState("");
  const photos = filterPhotos(archivePhotos, { month, tag });

  return (
    <main id="main" className={styles.page}>
      <div className={styles.backRow}>
        <Link href="/game/vrchat" className={styles.backLink}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="m9.5 3-5 5 5 5" />
          </svg>
          이전
        </Link>
      </div>
      <h1 className={styles.title} aria-label="PHOTO">
        <svg aria-hidden="true" focusable="false">
          <text
            x="0"
            y="0.85em"
            textLength="100%"
            lengthAdjust="spacingAndGlyphs"
          >
            PHOTO
          </text>
        </svg>
      </h1>

      <section className={styles.gallery} aria-label="PHOTO">
        <div className={styles.divider} aria-hidden="true">
          <span>PHOTO</span>
        </div>

        <div className={styles.filters}>
          <div className={styles.monthFilter}>
            <label htmlFor="photo-month">월별</label>
            <div className={styles.selectWrap}>
              <select
                id="photo-month"
                name="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                aria-controls="photo-grid"
              >
                <option value="">전체 월</option>
                {months.map((value) => (
                  <option key={value} value={value}>
                    {value.slice(0, 4)}년 {Number(value.slice(5))}월
                  </option>
                ))}
                {hasUndatedPhotos && <option value="undated">미지정</option>}
              </select>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m4 6 4 4 4-4" />
              </svg>
            </div>
          </div>

          <div className={styles.tags} role="group" aria-label="태그">
            <button
              type="button"
              aria-pressed={tag === ""}
              aria-controls="photo-grid"
              onClick={() => setTag("")}
            >
              ALL
            </button>
            {photoTags.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={tag === value}
                aria-controls="photo-grid"
                onClick={() => setTag(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div id="photo-grid" className={styles.results}>
          <p className="sr-only" role="status" aria-live="polite">
            사진 {photos.length}장
          </p>
          {photos.length > 0 ? (
            <ul className={styles.grid}>
              {photos.map((photo, index) => (
                <li key={photo.id} className={styles.photo} data-photo-card>
                  <Image
                    src={photo.src}
                    alt={photo.description}
                    fill
                    sizes="(max-width: 1600px) 29vw, 460px"
                    style={{ objectPosition: photo.position }}
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>사진이 없습니다.</p>
          )}
        </div>
      </section>
    </main>
  );
}
