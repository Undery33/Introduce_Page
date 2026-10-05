import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "관리자 — UNDERY",
  description: "준비 중",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <ComingSoon />;
}
