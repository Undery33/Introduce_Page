import { vrchatContent } from "../app/game/vrchat/vrchat-content";

export const photoTags = ["World", "Character", "Photo", "Video"] as const;
export type PhotoTag = (typeof photoTags)[number];

export type ArchivePhoto = (typeof vrchatContent.photos)[number] & {
  id: string;
  month: string | null;
  tags: readonly PhotoTag[];
};

export type PhotoFilters = {
  month?: string;
  tag?: string;
};

type PhotoMetadata = Partial<Pick<ArchivePhoto, "month" | "tags">>;

// 사진의 src를 키로 사용해 확인된 월(YYYY-MM)과 태그를 입력하세요.
// 설정하지 않은 사진은 날짜 미입력, Photo 태그로 표시합니다.
export const photoMetadataBySrc: Readonly<
  Record<string, PhotoMetadata | undefined>
> = {};

// The existing photos have no verified date metadata.
export const archivePhotos: readonly ArchivePhoto[] = vrchatContent.photos.map(
  (photo) => ({
    ...photo,
    id: photo.src,
    month: photoMetadataBySrc[photo.src]?.month ?? null,
    tags: photoMetadataBySrc[photo.src]?.tags ?? ["Photo"],
  }),
);

function isMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function getPhotoMonths(items: readonly ArchivePhoto[]): string[] {
  return [...new Set(items.map((item) => item.month))]
    .filter((month): month is string => month !== null && isMonth(month))
    .sort((a, b) => b.localeCompare(a));
}

export function filterPhotos<T extends ArchivePhoto>(
  items: readonly T[],
  { month = "", tag = "" }: PhotoFilters = {},
): T[] {
  const selectedTag = photoTags.find((value) => value === tag);
  const selectedMonth = month === "undated" || isMonth(month) ? month : "";

  return items.filter((item) => {
    const matchesMonth =
      !selectedMonth ||
      (selectedMonth === "undated"
        ? item.month === null
        : item.month === selectedMonth);
    const matchesTag = !selectedTag || item.tags.includes(selectedTag);
    return matchesMonth && matchesTag;
  });
}
