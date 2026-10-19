import { authorizedMutation } from "@/lib/admin/session";
import { adminFailure, adminJson, readJson } from "@/lib/admin/http";
import { parsePostInput } from "@/lib/admin/post-input";
import { createDraft } from "@/lib/admin/posts";
export async function POST(request: Request) {
  try {
    if (!(await authorizedMutation(request)))
      return adminJson(
        { error: "관리자 로그인이 필요하거나 세션이 만료되었습니다." },
        401,
      );
    return adminJson(
      await createDraft(parsePostInput(await readJson(request))),
      201,
    );
  } catch (error) {
    return adminFailure(error);
  }
}
