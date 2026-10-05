import { ComingSoon } from "@/components/coming-soon";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "VALORANT 하이라이트",
  "준비 중",
  "/game/highlights",
);

export default function Highlights() {
  return <ComingSoon />;
}
