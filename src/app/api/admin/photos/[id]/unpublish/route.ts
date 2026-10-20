import { authorizedMutation } from "@/lib/admin/session";
import { adminFailure, adminJson, readJson } from "@/lib/admin/http";
import { parseVersion } from "@/lib/admin/post-input";
import { setPhotoPublication } from "@/lib/admin/photos";
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
    return adminJson(
      await setPhotoPublication(
        (await context.params).id,
        parseVersion(await readJson(request)),
        false,
      ),
    );
  } catch (error) {
    return adminFailure(error);
  }
}
