import { SectionShell } from "@/components/section-shell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SectionShell section="whoami">{children}</SectionShell>;
}
