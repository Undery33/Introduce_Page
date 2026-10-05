import { ComingSoon } from "@/components/coming-soon";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("VALORANT", "준비 중", "/game/valorant");

export default function Valorant() {
  return <ComingSoon />;
}
