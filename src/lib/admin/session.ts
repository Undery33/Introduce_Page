import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/lib/db";
import {
  authConfiguration,
  cookieName,
  equalToken,
  isToken,
  sameOrigin,
  tokenHash,
} from "./security";

export async function adminSession() {
  const config = authConfiguration();
  if (!config) return null;
  const token = (await cookies()).get(
    cookieName("session", config.secure),
  )?.value;
  if (!isToken(token)) return null;
  const session = await getDatabase().adminSession.findUnique({
    where: { tokenHash: tokenHash(token) },
  });
  if (
    !session ||
    session.expiresAt <= new Date() ||
    session.githubUserId !== config.ownerId
  )
    return null;
  return session;
}
export async function requireAdminPage() {
  const session = await adminSession();
  if (!session) redirect("/admin");
  return session;
}
export async function authorizedMutation(request: Request) {
  const config = authConfiguration();
  if (!config) return null;
  if (!sameOrigin(request.headers, config.origin)) return null;
  const session = await adminSession();
  if (
    !session ||
    !equalToken(request.headers.get("x-csrf-token") ?? "", session.csrfToken)
  )
    return null;
  return session;
}
