import { customIcons } from "@/lib/admin/images";
import { randomUUID } from "node:crypto";
import { requireAdminPage } from "@/lib/admin/session";
import { PostEditor } from "../../post-editor";
export default async function NewPostPage() {
  const session = await requireAdminPage();
  return (
    <PostEditor
      icons={await customIcons()}
      csrfToken={session.csrfToken}
      initial={{
        slug: `post-${randomUUID().slice(0, 8)}`,
        title: "",
        description: "",
        category: "infrastructure",
        icon: "code",
        tags: [],
        sections: [{ id: randomUUID(), title: "본문", markdown: "" }],
      }}
    />
  );
}
