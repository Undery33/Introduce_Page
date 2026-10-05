"use client";

import { usePathname } from "next/navigation";
import { SectionShell } from "@/components/section-shell";
export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname === "/coding" ? (
    <SectionShell section="coding">{children}</SectionShell>
  ) : (
    children
  );
}
