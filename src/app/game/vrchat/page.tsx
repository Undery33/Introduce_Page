import { pageMetadata } from "@/lib/metadata";
import { VrchatDraft } from "./vrchat-draft";
import { getVrchatPhotos } from "@/lib/vrchat-store";
export const dynamic = "force-dynamic";

export const metadata = pageMetadata(
  "UNDERY — A small place for our moments",
  "Undery의 작은 공간. 좋아하는 순간과 함께한 사람들을 기록합니다.",
  "/game/vrchat",
);

export default async function VrchatPage() {
  const photos = (await getVrchatPhotos())
    .filter((photo) => photo.showOnHome)
    .slice(0, 6);
  return <VrchatDraft photos={photos} />;
}
