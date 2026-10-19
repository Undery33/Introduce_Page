import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { adminSession } from "@/lib/admin/session";
import { adminFailure, adminJson } from "@/lib/admin/http";
import {
  authConfiguration,
  cookieName,
  equalToken,
  sameOrigin,
} from "@/lib/admin/security";

export async function POST(request: Request) {
  try {
    const config = authConfiguration();
    if (!config || !sameOrigin(request.headers, config.origin))
      return adminJson({ error: "허용되지 않은 요청입니다." }, 403);
    const session = await adminSession();
    const data = await request.formData();
    if (
      !session ||
      !equalToken(String(data.get("csrfToken") ?? ""), session.csrfToken)
    )
      return adminJson({ error: "로그인이 필요합니다." }, 401);
    await getDatabase().adminSession.deleteMany({
      where: { tokenHash: session.tokenHash },
    });
    (await cookies()).set(cookieName("session", config.secure), "", {
      httpOnly: true,
      secure: config.secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return NextResponse.redirect(`${config.origin}/admin`, 303);
  } catch (error) {
    return adminFailure(error);
  }
}
