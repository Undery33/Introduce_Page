import { authorizedMutation } from "@/lib/admin/session";
import { adminFailure, adminJson, readJson } from "@/lib/admin/http";
import { parsePostInput, parseVersion } from "@/lib/admin/post-input";
import { saveDraft } from "@/lib/admin/posts";
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await authorizedMutation(request)))
      return adminJson(
        { error: "관리자 로그인이 필요하거나 세션이 만료되었습니다." },
        401,
      );
    const input = await readJson(request);
    return adminJson(
      await saveDraft(
        (await context.params).id,
        parseVersion(input),
        parsePostInput(input),
      ),
    );
  } catch (error) {
    return adminFailure(error);
  }
}
