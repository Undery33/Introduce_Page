import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "데이터 처리 안내 — UNDERY",
  description: "준비 중",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <ComingSoon />;
}
