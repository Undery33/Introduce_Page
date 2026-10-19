import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/session";
import { loadPhoto } from "@/lib/admin/photos";
import { PhotoEditor } from "../photo-editor";
export default async function EditPhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminPage();
  const photo = await loadPhoto((await params).id);
  if (!photo) notFound();
  return <PhotoEditor csrfToken={session.csrfToken} initial={photo} />;
}
