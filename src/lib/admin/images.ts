import { randomBytes } from "node:crypto";
import { isAbsolute, join } from "node:path";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { getDatabase } from "../db";
import { imageIdFromUrl, imageUrl, type IconOption } from "../media";
import { AdminError } from "./errors";
import { normalizeImage, readImageBytes } from "./image-processing";

export function mediaDirectory(): string {
  const directory = process.env.MEDIA_DIRECTORY;
  if (!directory || !isAbsolute(directory))
    throw new AdminError(503, "사진 저장소 설정이 필요합니다.");
  return directory;
}
export async function checkMediaDirectory() {
  await access(mediaDirectory(), constants.R_OK | constants.W_OK);
}
let activeUploads = 0;
export async function storeImage(request: Request) {
  if (activeUploads >= 2)
    throw new AdminError(
      429,
      "이미지를 처리 중입니다. 잠시 후 다시 시도하십시오.",
    );
  activeUploads++;
  try {
    const directory = mediaDirectory();
    const bytes = await readImageBytes(request);
    const { data, info } = await normalizeImage(bytes);
    const id = randomBytes(16).toString("hex");
    const path = join(directory, `${id}.webp`);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(path, data, { flag: "wx", mode: 0o600 });
    try {
      await getDatabase().uploadedImage.create({
        data: {
          id,
          width: info.width,
          height: info.height,
          bytes: data.length,
        },
      });
    } catch (error) {
      await unlink(path).catch(() => undefined);
      throw error;
    }
    return { id, url: imageUrl(id), width: info.width, height: info.height };
  } finally {
    activeUploads--;
  }
}
export async function loadImage(id: string) {
  if (!/^[a-f0-9]{32}$/.test(id))
    throw new AdminError(404, "이미지가 없습니다.");
  return readFile(join(mediaDirectory(), `${id}.webp`));
}
export async function isImagePublic(url: string) {
  const db = getDatabase();
  const [post, photo] = await Promise.all([
    db.codingPost.findFirst({
      where: {
        status: "PUBLISHED",
        OR: [{ icon: url }, { markdown: { contains: `](${url})` } }],
      },
      select: { id: true },
    }),
    db.vrchatPhoto.findFirst({
      where: { status: "PUBLISHED", published: { path: ["src"], equals: url } },
      select: { id: true },
    }),
  ]);
  return Boolean(post || photo);
}
export async function customIcons(): Promise<IconOption[]> {
  return (
    await getDatabase().customIcon.findMany({
      orderBy: { createdAt: "asc" },
      select: { label: true, imageId: true },
    })
  ).map((icon) => ({ label: icon.label, value: imageUrl(icon.imageId) }));
}
export async function createCustomIcon(input: unknown): Promise<IconOption> {
  const value = input as { label?: unknown; url?: unknown } | null;
  const label = typeof value?.label === "string" ? value.label.trim() : "";
  const imageId = imageIdFromUrl(value?.url);
  if (!label || label.length > 40 || !imageId)
    throw new AdminError(400, "아이콘 이름(1~40자)과 이미지를 확인하십시오.");
  if (
    !(await getDatabase().uploadedImage.findUnique({ where: { id: imageId } }))
  )
    throw new AdminError(400, "업로드한 이미지가 없습니다.");
  await getDatabase().customIcon.create({ data: { label, imageId } });
  return { label, value: imageUrl(imageId) };
}
