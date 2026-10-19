import { revalidatePath } from "next/cache";
import { authorizedMutation } from "@/lib/admin/session";
import { adminFailure, adminJson, readJson } from "@/lib/admin/http";
import { parseVersion } from "@/lib/admin/post-input";
import { unpublishDraft } from "@/lib/admin/posts";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await authorizedMutation(request)))
      return adminJson(
        { error: "관리자 로그인이 필요하거나 세션이 만료되었습니다." },
        401,
      );
    const post = await unpublishDraft(
      (await context.params).id,
      parseVersion(await readJson(request)),
    );
    revalidatePath("/coding");
    revalidatePath(`/coding/${post.slug}`);
    revalidatePath("/coding/sitemap.xml");
    return adminJson(post);
  } catch (error) {
    return adminFailure(error);
  }
}
