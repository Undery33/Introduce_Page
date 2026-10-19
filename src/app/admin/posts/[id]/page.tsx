import { customIcons } from "@/lib/admin/images";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/session";
import { loadDraft } from "@/lib/admin/posts";
import { PostEditor } from "../../post-editor";
export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminPage();
  const post = await loadDraft((await params).id);
  if (!post) notFound();
  return (
    <PostEditor
      icons={await customIcons()}
      csrfToken={session.csrfToken}
      initial={post}
    />
  );
}
