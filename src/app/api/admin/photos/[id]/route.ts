import { authorizedMutation } from "@/lib/admin/session";
import { adminFailure, adminJson, readJson } from "@/lib/admin/http";
import { parsePhotoInput } from "@/lib/admin/photo-input";
import { parseVersion } from "@/lib/admin/post-input";
import { savePhoto } from "@/lib/admin/photos";
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
    const value = await readJson(request);
    return adminJson(
      await savePhoto(
        (await context.params).id,
        parseVersion(value),
        parsePhotoInput(value),
      ),
    );
  } catch (error) {
    return adminFailure(error);
  }
}
