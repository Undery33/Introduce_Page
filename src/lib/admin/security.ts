import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type AuthConfiguration = {
  origin: string;
  clientId: string;
  clientSecret: string;
  ownerId: string;
  secure: boolean;
};

export function authConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): AuthConfiguration | null {
  if (
    !env.DATABASE_URL ||
    !env.GITHUB_CLIENT_ID ||
    !env.GITHUB_CLIENT_SECRET ||
    !/^\d+$/.test(env.ADMIN_GITHUB_ID ?? "")
  )
    return null;
  try {
    const url = new URL(env.SITE_URL ?? "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    if (
      url.protocol !== "https:" &&
      !(env.NODE_ENV === "development" && local && url.protocol === "http:")
    )
      return null;
    return {
      origin: url.origin,
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      ownerId: env.ADMIN_GITHUB_ID!,
      secure: url.protocol === "https:",
    };
  } catch {
    return null;
  }
}

export const randomToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const pkceChallenge = (value: string) =>
  createHash("sha256").update(value).digest("base64url");
export const isToken = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
export function equalToken(a: string, b: string): boolean {
  return (
    isToken(a) && isToken(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
export function isOwner(id: unknown, ownerId: string): boolean {
  return (
    typeof id === "number" &&
    Number.isSafeInteger(id) &&
    id > 0 &&
    String(id) === ownerId
  );
}
export function sameOrigin(headers: Headers, origin: string): boolean {
  return (
    headers.get("origin") === origin &&
    !["cross-site", "same-site"].includes(headers.get("sec-fetch-site") ?? "")
  );
}
export function cookieName(kind: "session" | "login", secure: boolean): string {
  return `${secure ? "__Host-" : ""}undery-${kind}`;
}
export function authorizationUrl(
  config: AuthConfiguration,
  state: string,
  verifier: string,
): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${config.origin}/api/auth/github/callback`,
    state,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: "S256",
    scope: "",
    allow_signup: "false",
  }).toString();
  return url.href;
}

// Fixed HTTPS endpoints, no browser-supplied host/redirect or logged OAuth tokens.
export async function githubIdentity(
  config: AuthConfiguration,
  code: string,
  verifier: string,
  request: typeof fetch = fetch,
): Promise<number> {
  const result = await request("https://github.com/login/oauth/access_token", {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      code_verifier: verifier,
      redirect_uri: `${config.origin}/api/auth/github/callback`,
    }),
  });
  if (!result.ok) throw new Error("OAuth exchange failed");
  const token: unknown = await result.json();
  if (
    !token ||
    typeof token !== "object" ||
    !("access_token" in token) ||
    typeof token.access_token !== "string" ||
    !("token_type" in token) ||
    token.token_type !== "bearer"
  )
    throw new Error("OAuth exchange failed");
  const profile = await request("https://api.github.com/user", {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "undery-admin",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!profile.ok) throw new Error("Identity verification failed");
  const identity: unknown = await profile.json();
  if (
    !identity ||
    typeof identity !== "object" ||
    !("id" in identity) ||
    !isOwner(identity.id, config.ownerId)
  )
    throw new Error("Account is not authorized");
  return identity.id as number;
}
