import { pageMetadata } from "@/lib/metadata";
import { VrchatDraft } from "./vrchat-draft";

export const metadata = pageMetadata(
  "UNDERY — A small place for our moments",
  "Undery의 작은 공간. 좋아하는 순간과 함께한 사람들을 기록합니다.",
  "/game/vrchat",
);

export default function VrchatPage() {
  return <VrchatDraft />;
}
