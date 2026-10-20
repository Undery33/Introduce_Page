import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { adminJson } from "@/lib/admin/http";
import {
  authConfiguration,
  authorizationUrl,
  cookieName,
  randomToken,
  sameOrigin,
  tokenHash,
} from "@/lib/admin/security";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const config = authConfiguration();
  if (!config)
    return adminJson({ error: "관리자 로그인이 설정되지 않았습니다." }, 503);
  if (!sameOrigin(request.headers, config.origin))
    return adminJson({ error: "허용되지 않은 요청입니다." }, 403);
  try {
    const state = randomToken(),
      browser = randomToken(),
      verifier = randomToken();
    const db = getDatabase();
    await db.adminLoginAttempt.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    await db.adminLoginAttempt.create({
      data: {
        stateHash: tokenHash(state),
        browserHash: tokenHash(browser),
        verifier,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    const response = NextResponse.redirect(
      authorizationUrl(config, state, verifier),
      303,
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(cookieName("login", config.secure), browser, {
      httpOnly: true,
      secure: config.secure,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch {
    return adminJson(
      { error: "로그인을 시작하지 못했습니다. 잠시 후 다시 시도하십시오." },
      503,
    );
  }
}
