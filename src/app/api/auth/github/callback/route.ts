import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { adminJson } from "@/lib/admin/http";
import {
  authConfiguration,
  cookieName,
  githubIdentity,
  isToken,
  randomToken,
  tokenHash,
} from "@/lib/admin/security";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const config = authConfiguration();
  if (!config)
    return adminJson({ error: "관리자 로그인이 설정되지 않았습니다." }, 503);
  const response = NextResponse.redirect(
    `${config.origin}/admin?error=login`,
    303,
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set(cookieName("login", config.secure), "", {
    httpOnly: true,
    secure: config.secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const browser = request.cookies.get(
    cookieName("login", config.secure),
  )?.value;
  if (
    !isToken(state) ||
    !isToken(browser) ||
    !code ||
    code.length > 512 ||
    request.nextUrl.searchParams.has("error")
  )
    return response;
  try {
    const db = getDatabase();
    const where = {
      stateHash: tokenHash(state),
      browserHash: tokenHash(browser),
      expiresAt: { gt: new Date() },
    };
    const attempt = await db.adminLoginAttempt.findFirst({ where });
    if (!attempt) return response;
    // Atomic consumption before exchanging the code prevents replay/races.
    if ((await db.adminLoginAttempt.deleteMany({ where })).count !== 1)
      return response;
    const identity = await githubIdentity(config, code, attempt.verifier);
    const token = randomToken();
    const oldToken = request.cookies.get(
      cookieName("session", config.secure),
    )?.value;
    await db.adminSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: new Date() } },
          ...(isToken(oldToken) ? [{ tokenHash: tokenHash(oldToken) }] : []),
        ],
      },
    });
    await db.adminIdentity.upsert({
      where: { githubUserId: String(identity) },
      create: { githubUserId: String(identity) },
      update: {},
    });
    await db.adminSession.create({
      data: {
        tokenHash: tokenHash(token),
        githubUserId: String(identity),
        csrfToken: randomToken(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });
    response.headers.set("Location", `${config.origin}/admin`);
    response.cookies.set(cookieName("session", config.secure), token, {
      httpOnly: true,
      secure: config.secure,
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return response;
  } catch {
    return response;
  }
}
