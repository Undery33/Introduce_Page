import { Prisma, type VrchatPhoto } from "@prisma/client";
import { getDatabase } from "../db";
import { imageIdFromUrl } from "../media";
import { archivePhotos } from "../vrchat-photos";
import { AdminError } from "./errors";
import {
  legacyPhotos,
  photoSnapshot,
  type PhotoDocument,
  type PhotoInput,
  type PhotoSnapshot,
} from "./photo-input";

function document(row: VrchatPhoto): PhotoDocument {
  return {
    ...photoSnapshot(row.draft as unknown as PhotoSnapshot),
    id: row.id,
    version: row.version,
    publishedVersion: row.publishedVersion,
    publicStatus: row.status,
  };
}
async function snapshot(input: PhotoInput): Promise<PhotoSnapshot> {
  const id = imageIdFromUrl(input.src);
  const image = id
    ? await getDatabase().uploadedImage.findUnique({ where: { id } })
    : archivePhotos.find((photo) => photo.src === input.src);
  if (!image) throw new AdminError(400, "업로드한 사진을 찾을 수 없습니다.");
  return {
    ...input,
    width: image.width,
    height: image.height,
    avatarPosition: input.position,
  };
}
export async function listPhotos() {
  const rows = await getDatabase().vrchatPhoto.findMany();
  const all = new Map(legacyPhotos.map((photo) => [photo.id, photo]));
  for (const row of rows) all.set(row.id, document(row));
  return [...all.values()].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  );
}
export async function loadPhoto(id: string) {
  const row = await getDatabase().vrchatPhoto.findUnique({ where: { id } });
  return row
    ? document(row)
    : (legacyPhotos.find((photo) => photo.id === id) ?? null);
}
export async function createPhoto(input: PhotoInput) {
  return document(
    await getDatabase().vrchatPhoto.create({
      data: {
        draft: (await snapshot(input)) as unknown as Prisma.InputJsonValue,
      },
    }),
  );
}
export async function savePhoto(
  id: string,
  version: number,
  input: PhotoInput,
) {
  const draft = (await snapshot(input)) as unknown as Prisma.InputJsonValue;
  try {
    return await getDatabase().$transaction(async (db) => {
      const row = await db.vrchatPhoto.findUnique({ where: { id } });
      if (!row) {
        const legacy = legacyPhotos.find((photo) => photo.id === id);
        if (!legacy) throw new AdminError(404, "사진을 찾을 수 없습니다.");
        if (version !== 1)
          throw new AdminError(
            409,
            "사진이 변경됐습니다. 다시 열어 확인하십시오.",
          );
        // Keep the original public photo while its first edited draft is saved.
        return document(
          await db.vrchatPhoto.create({
            data: {
              id,
              legacySrc: legacy.src,
              draft,
              published: photoSnapshot(
                legacy,
              ) as unknown as Prisma.InputJsonValue,
              status: "PUBLISHED",
              version: 2,
              publishedVersion: 1,
            },
          }),
        );
      }
      const updated = await db.vrchatPhoto.updateMany({
        where: { id, version },
        data: { draft, version: { increment: 1 } },
      });
      if (updated.count !== 1)
        throw new AdminError(
          409,
          "다른 창에서 수정된 사진입니다. 현재 내용을 복사한 뒤 다시 여십시오.",
        );
      return document(
        await db.vrchatPhoto.findUniqueOrThrow({ where: { id } }),
      );
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new AdminError(
        409,
        "다른 창에서 먼저 저장했습니다. 사진을 다시 여십시오.",
      );
    throw error;
  }
}
export async function setPhotoPublication(
  id: string,
  version: number,
  publish: boolean,
) {
  return getDatabase().$transaction(async (db) => {
    const changed = await db.vrchatPhoto.updateMany({
      where: { id, version },
      data: { version: { increment: 1 } },
    });
    if (changed.count !== 1)
      throw new AdminError(
        409,
        "사진이 변경됐거나 없습니다. 다시 열어 확인하십시오.",
      );
    const row = await db.vrchatPhoto.findUniqueOrThrow({ where: { id } });
    return document(
      await db.vrchatPhoto.update({
        where: { id },
        data: publish
          ? {
              published: row.draft as Prisma.InputJsonValue,
              status: "PUBLISHED",
              publishedVersion: row.version,
            }
          : { status: "ARCHIVED", publishedVersion: null },
      }),
    );
  });
}
