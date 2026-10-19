import { pageMetadata } from "@/lib/metadata";
import { PhotoGallery } from "./photo-gallery";
import { getVrchatPhotos } from "@/lib/vrchat-store";
export const dynamic = "force-dynamic";

export const metadata = pageMetadata(
  "PHOTO",
  "VRChat 사진을 월별·태그별로 조회합니다.",
  "/game/vrchat/photo",
);

export default async function VrchatPhotoPage() {
  return <PhotoGallery photos={await getVrchatPhotos()} />;
}
