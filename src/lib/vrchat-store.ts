import { getDatabase } from "./db";
import {
  legacyPhotos,
  publicPhoto,
  type PhotoSnapshot,
} from "./admin/photo-input";
export async function getVrchatPhotos() {
  const all = new Map(
    legacyPhotos.map((photo) => [photo.id, publicPhoto(photo.id, photo)]),
  );
  if (process.env.DATABASE_URL) {
    const rows = await getDatabase().vrchatPhoto.findMany({
      select: { id: true, status: true, published: true },
    });
    for (const row of rows) {
      if (row.status === "PUBLISHED" && row.published)
        all.set(
          row.id,
          publicPhoto(row.id, row.published as unknown as PhotoSnapshot),
        );
      else all.delete(row.id);
    }
  }
  return [...all.values()].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  );
}
