import {
  archivePhotos,
  photoTags,
  type ArchivePhoto,
  type PhotoTag,
} from "../vrchat-photos";
import { imageIdFromUrl } from "../media";
import { AdminError } from "./errors";
export type PhotoInput = {
  title: string;
  description: string;
  src: string;
  month: string | null;
  tags: PhotoTag[];
  position: string;
  order: number;
  showOnHome: boolean;
};
export type PhotoSnapshot = PhotoInput & {
  width: number;
  height: number;
  avatarPosition: string;
};
export type PhotoDocument = PhotoSnapshot & {
  id: string;
  version: number;
  publishedVersion: number | null;
  publicStatus: string;
};
export const legacyPhotos: PhotoDocument[] = archivePhotos.map((photo, i) => ({
  ...photo,
  id: `legacy-${photo.src
    .split("/")
    .pop()!
    .replace(/\.[^.]+$/, "")}`,
  tags: [...photo.tags],
  order: (i + 1) * 10,
  showOnHome: true,
  version: 1,
  publishedVersion: 1,
  publicStatus: "PUBLISHED",
}));
export function photoSnapshot(photo: PhotoSnapshot): PhotoSnapshot {
  return {
    title: photo.title,
    description: photo.description,
    src: photo.src,
    month: photo.month,
    tags: [...photo.tags],
    position: photo.position,
    avatarPosition: photo.avatarPosition,
    order: photo.order,
    showOnHome: photo.showOnHome,
    width: photo.width,
    height: photo.height,
  };
}
export function parsePhotoInput(value: unknown): PhotoInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new AdminError(400, "사진 정보를 확인하십시오.");
  const input = value as Record<string, unknown>;
  const text = (name: string, max: number, required = true) => {
    const value = input[name];
    if (
      typeof value !== "string" ||
      (required && !value.trim()) ||
      value.length > max ||
      /\u0000/.test(value)
    )
      throw new AdminError(400, "사진 제목·설명·주소를 확인하십시오.");
    return value.trim();
  };
  const title = text("title", 120),
    description = text("description", 500, false),
    src = text("src", 200);
  if (!imageIdFromUrl(src) && !archivePhotos.some((photo) => photo.src === src))
    throw new AdminError(400, "사진 파일을 업로드하십시오.");
  const month = input.month === "" ? null : input.month;
  if (
    month !== null &&
    (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
  )
    throw new AdminError(400, "촬영 월은 YYYY-MM 형식입니다.");
  if (
    !Array.isArray(input.tags) ||
    !input.tags.length ||
    input.tags.length > 4 ||
    !input.tags.every((tag) => photoTags.includes(tag as PhotoTag))
  )
    throw new AdminError(400, "사진 태그를 선택하십시오.");
  if (
    typeof input.position !== "string" ||
    !/^(100|[0-9]{1,2})% (100|[0-9]{1,2})%$/.test(input.position)
  )
    throw new AdminError(400, "사진의 표시 중심을 확인하십시오.");
  if (
    !Number.isInteger(input.order) ||
    Number(input.order) < 0 ||
    Number(input.order) > 9999 ||
    typeof input.showOnHome !== "boolean"
  )
    throw new AdminError(400, "표시 순서와 메인 표시 여부를 확인하십시오.");
  return {
    title,
    description,
    src,
    month: month as string | null,
    tags: [...new Set(input.tags as PhotoTag[])],
    position: input.position,
    order: input.order as number,
    showOnHome: input.showOnHome,
  };
}
export function publicPhoto(
  id: string,
  snapshot: PhotoSnapshot,
): ArchivePhoto & { order: number; showOnHome: boolean } {
  return { id, ...photoSnapshot(snapshot) };
}
