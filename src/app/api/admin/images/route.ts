import { authorizedMutation } from "@/lib/admin/session";
import { adminFailure, adminJson } from "@/lib/admin/http";
import { storeImage } from "@/lib/admin/images";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (!(await authorizedMutation(request)))
      return adminJson(
        { error: "관리자 로그인이 필요하거나 세션이 만료되었습니다." },
        401,
      );
    return adminJson(await storeImage(request), 201);
  } catch (error) {
    return adminFailure(error);
  }
}
