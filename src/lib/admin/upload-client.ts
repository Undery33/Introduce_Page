import { MAX_IMAGE_BYTES, type UploadedImageResult } from "../media";
export async function uploadImage(
  file: File,
  csrfToken: string,
): Promise<UploadedImageResult> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type))
    throw new Error("PNG·JPEG·WebP 이미지를 선택하십시오.");
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error("사진은 한 장당 20 MiB 이하입니다.");
  const response = await fetch("/api/admin/images", {
    method: "POST",
    headers: { "Content-Type": file.type, "X-CSRF-Token": csrfToken },
    body: file,
  });
  const result = await response
    .json()
    .catch(() => ({
      error:
        response.status === 413
          ? "사진 용량이 서버 제한을 초과했습니다."
          : "이미지 업로드 응답을 확인하지 못했습니다.",
    }));
  if (!response.ok)
    throw new Error(result.error || "이미지를 업로드하지 못했습니다.");
  return result;
}
