import { ComingSoon } from "@/components/coming-soon";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata("준비 중", "준비 중", "/game/gallery");
export default function Gallery() {
  return <ComingSoon />;
}
