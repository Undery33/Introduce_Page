import { requireAdminPage } from "@/lib/admin/session";
import { PhotoEditor } from "../photo-editor";
export default async function NewPhotoPage() {
  const session = await requireAdminPage();
  return (
    <PhotoEditor
      csrfToken={session.csrfToken}
      initial={{
        title: "",
        description: "",
        src: "",
        month: null,
        tags: ["Photo"],
        position: "50% 50%",
        order: 0,
        showOnHome: true,
      }}
    />
  );
}
