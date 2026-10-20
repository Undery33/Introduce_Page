import sharp from "sharp";
import { AdminError } from "./errors";
import { MAX_IMAGE_BYTES } from "../media";

export async function readImageBytes(request: Request): Promise<Buffer> {
  if (
    !/^image\/(png|jpeg|webp)$/.test(request.headers.get("content-type") ?? "")
  )
    throw new AdminError(415, "PNG·JPEG·WebP 이미지만 지원합니다.");
  if (Number(request.headers.get("content-length")) > MAX_IMAGE_BYTES)
    throw new AdminError(413, "사진은 한 장당 20 MiB 이하로 선택하십시오.");
  const reader = request.body?.getReader();
  if (!reader) throw new AdminError(400, "이미지 파일이 없습니다.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.length;
      if (length > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new AdminError(413, "사진은 한 장당 20 MiB 이하로 선택하십시오.");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!length) throw new AdminError(400, "빈 이미지 파일입니다.");
  return Buffer.concat(chunks);
}

export async function normalizeImage(bytes: Buffer) {
  // Check signatures before invoking any decoder (SVG is never rendered).
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP";
  if (!png && !jpeg && !webp)
    throw new AdminError(415, "지원하는 이미지 파일이 아닙니다.");
  try {
    const pipeline = sharp(bytes, {
      limitInputPixels: 40_000_000,
      failOn: "warning",
    });
    const metadata = await pipeline.metadata();
    if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1)
      throw new Error("Unsupported image");
    // Auto-orient, bound dimensions, and remove EXIF/GPS by re-encoding.
    return await pipeline
      .rotate()
      .resize({
        width: 4096,
        height: 4096,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new AdminError(
      400,
      "이미지를 읽을 수 없습니다. 정지 이미지와 4천만 픽셀 이하 파일을 사용하십시오.",
    );
  }
}
