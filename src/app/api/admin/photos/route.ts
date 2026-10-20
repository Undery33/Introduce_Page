import { authorizedMutation } from "@/lib/admin/session";
import { adminFailure, adminJson, readJson } from "@/lib/admin/http";
import { parsePhotoInput } from "@/lib/admin/photo-input";
import { createPhoto } from "@/lib/admin/photos";
export async function POST(request: Request) {
  try {
    if (!(await authorizedMutation(request)))
      return adminJson(
        { error: "관리자 로그인이 필요하거나 세션이 만료되었습니다." },
        401,
      );
    return adminJson(
      await createPhoto(parsePhotoInput(await readJson(request))),
      201,
    );
  } catch (error) {
    return adminFailure(error);
  }
}
