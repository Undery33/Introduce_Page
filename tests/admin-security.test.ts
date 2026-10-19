import assert from "node:assert/strict";
import test from "node:test";
import {
  authConfiguration,
  authorizationUrl,
  cookieName,
  equalToken,
  githubIdentity,
  isOwner,
  pkceChallenge,
  randomToken,
  sameOrigin,
  tokenHash,
} from "../src/lib/admin/security";

const env: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://localhost/undery_test",
  SITE_URL: "https://undery.link",
  GITHUB_CLIENT_ID: "test-id",
  GITHUB_CLIENT_SECRET: "test-secret",
  ADMIN_GITHUB_ID: "127064386",
};
const config = authConfiguration(env)!;
test("authentication stays closed without every required setting and canonical HTTPS origin", () => {
  for (const key of [
    "DATABASE_URL",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "ADMIN_GITHUB_ID",
    "SITE_URL",
  ])
    assert.equal(authConfiguration({ ...env, [key]: "" }), null);
  for (const origin of [
    "http://undery.link",
    "https://user:password@undery.link",
    "https://undery.link/other",
    "https://undery.link?x=1",
  ])
    assert.equal(authConfiguration({ ...env, SITE_URL: origin }), null);
  assert.equal(
    authConfiguration({
      ...env,
      NODE_ENV: "development",
      SITE_URL: "http://127.0.0.1:3000",
    })?.secure,
    false,
  );
  assert.equal(
    authConfiguration({
      ...env,
      NODE_ENV: "production",
      SITE_URL: "http://127.0.0.1:3000",
    }),
    null,
  );
});
test("only the verified numeric owner ID is accepted", () => {
  assert.equal(isOwner(127064386, config.ownerId), true);
  for (const id of ["127064386", "Undery33", 1, null, {}, Number.NaN])
    assert.equal(isOwner(id, config.ownerId), false);
});
test("OAuth uses independent random tokens, S256 PKCE, exact callback and no repository scope", () => {
  const state = randomToken(),
    verifier = randomToken();
  assert.notEqual(state, verifier);
  assert.notEqual(tokenHash(state), state);
  assert.equal(equalToken(state, state), true);
  assert.equal(equalToken(state, "short"), false);
  const url = new URL(authorizationUrl(config, state, verifier));
  assert.equal(url.origin, "https://github.com");
  assert.equal(url.searchParams.get("code_challenge"), pkceChallenge(verifier));
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "https://undery.link/api/auth/github/callback",
  );
  assert.equal(url.searchParams.get("scope"), "");
  assert.equal(cookieName("session", true), "__Host-undery-session");
});
test("mutations reject missing, foreign and sibling origins", () => {
  assert.equal(
    sameOrigin(
      new Headers({ origin: config.origin, "sec-fetch-site": "same-origin" }),
      config.origin,
    ),
    true,
  );
  for (const headers of [
    new Headers(),
    new Headers({ origin: "https://evil.example" }),
    new Headers({ origin: config.origin, "sec-fetch-site": "cross-site" }),
    new Headers({
      origin: "https://sub.undery.link",
      "sec-fetch-site": "same-site",
    }),
  ])
    assert.equal(sameOrigin(headers, config.origin), false);
});
test("OAuth exchanges a code with PKCE then revalidates the actual GitHub account", async () => {
  const calls: { url: string; options?: RequestInit }[] = [];
  const request = (async (
    url: string | URL | Request,
    options?: RequestInit,
  ) => {
    calls.push({ url: String(url), options });
    return calls.length === 1
      ? Response.json({
          access_token: "private-test-token",
          token_type: "bearer",
        })
      : Response.json({ id: 127064386, login: "renamed-account" });
  }) as typeof fetch;
  assert.equal(
    await githubIdentity(config, "test-code", "test-verifier", request),
    127064386,
  );
  assert.equal(calls[0].options?.redirect, "error");
  assert.equal(
    (calls[0].options?.body as URLSearchParams).get("code_verifier"),
    "test-verifier",
  );
  assert.equal(calls[1].url, "https://api.github.com/user");
  const denied = (async (url: string | URL | Request) =>
    String(url).includes("access_token")
      ? Response.json({ access_token: "test", token_type: "bearer" })
      : Response.json({ id: 9, login: "Undery33" })) as typeof fetch;
  await assert.rejects(
    githubIdentity(config, "code", "verifier", denied),
    /not authorized/,
  );
});
