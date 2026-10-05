import { test } from "node:test";
import assert from "node:assert/strict";
import { vrchatContent } from "../src/app/game/vrchat/vrchat-content";
import {
  archivePhotos,
  filterPhotos,
  getPhotoMonths,
  type ArchivePhoto,
} from "../src/lib/vrchat-photos";

function photo(
  id: string,
  month: string | null,
  tags: ArchivePhoto["tags"],
): ArchivePhoto {
  return { ...vrchatContent.photos[0], id, month, tags };
}

const photos = [
  photo("spring-world", "2025-04", ["World", "Photo"]),
  photo("winter-character", "2025-12", ["Character", "Photo"]),
  photo("winter-video", "2025-12", ["World", "Video"]),
  photo("new-year", "2026-01", ["Character", "Photo"]),
  photo("undated", null, ["Photo"]),
];

const ids = (items: readonly ArchivePhoto[]) => items.map((item) => item.id);

test("month and tag filters combine and preserve source ordering", () => {
  assert.deepEqual(ids(filterPhotos(photos, { month: "2025-12" })), [
    "winter-character",
    "winter-video",
  ]);
  assert.deepEqual(ids(filterPhotos(photos, { tag: "World" })), [
    "spring-world",
    "winter-video",
  ]);
  assert.deepEqual(
    ids(filterPhotos(photos, { month: "2025-12", tag: "Photo" })),
    ["winter-character"],
  );
  assert.deepEqual(ids(filterPhotos(photos, { tag: "Video" })), [
    "winter-video",
  ]);
  assert.deepEqual(
    filterPhotos(photos, { month: "2026-01", tag: "World" }),
    [],
  );
});

test("undated records remain available without being assigned a date", () => {
  assert.deepEqual(ids(filterPhotos(photos, { month: "undated" })), [
    "undated",
  ]);
  assert.deepEqual(
    filterPhotos(photos, { month: "undated", tag: "Video" }),
    [],
  );
  assert.equal(filterPhotos(photos).length, photos.length);
  assert.equal(
    filterPhotos(photos, { month: "all", tag: "all" }).length,
    photos.length,
  );
  assert.equal(archivePhotos.length, vrchatContent.photos.length);
  assert.equal(
    new Set(archivePhotos.map((item) => item.id)).size,
    archivePhotos.length,
  );
  for (const item of archivePhotos) {
    assert.equal(item.month, null);
    assert.deepEqual(item.tags, ["Photo"]);
    const original = vrchatContent.photos.find(
      (source) => source.src === item.src,
    );
    assert.ok(original);
    for (const key of Object.keys(original) as (keyof typeof original)[])
      assert.equal(item[key], original[key]);
  }
});

test("invalid filters fall back independently without hiding matching photos", () => {
  for (const month of ["2025-00", "2025-13", "2025-1", "2025-01-01", "bad"])
    assert.deepEqual(ids(filterPhotos(photos, { month, tag: "World" })), [
      "spring-world",
      "winter-video",
    ]);
  assert.deepEqual(
    ids(filterPhotos(photos, { month: "2025-12", tag: "unknown" })),
    ["winter-character", "winter-video"],
  );
  assert.deepEqual(filterPhotos([], { month: "2025-12", tag: "Photo" }), []);
});

test("month options contain only recorded valid months in newest-first order", () => {
  assert.deepEqual(
    getPhotoMonths([...photos, photo("invalid", "2025-13", ["Photo"])]),
    ["2026-01", "2025-12", "2025-04"],
  );
  assert.deepEqual(getPhotoMonths(archivePhotos), []);
});
