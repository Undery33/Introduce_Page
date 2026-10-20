import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST as create } from "../src/app/api/admin/posts/route";
import { PUT as update } from "../src/app/api/admin/posts/[id]/route";
import { POST as publish } from "../src/app/api/admin/posts/[id]/publish/route";
import { POST as unpublish } from "../src/app/api/admin/posts/[id]/unpublish/route";
import { POST as login } from "../src/app/api/auth/github/route";
import { GET as callback } from "../src/app/api/auth/github/callback/route";
import { POST as logout } from "../src/app/api/auth/logout/route";

test("unconfigured route handlers reject forged admin input before reading it", async (t) => {
  const original = process.env.GITHUB_CLIENT_SECRET;
  delete process.env.GITHUB_CLIENT_SECRET;
  t.after(() => {
    if (original === undefined) delete process.env.GITHUB_CLIENT_SECRET;
    else process.env.GITHUB_CLIENT_SECRET = original;
  });
  const context = { params: Promise.resolve({ id: "forged" }) };
  for (const handler of [create, update, publish, unpublish]) {
    const request = new Request("https://undery.link/api/admin/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://undery.link",
      },
      body: '{"role":"admin","githubUserId":"127064386"}',
    });
    const response = await handler(request, context);
    assert.equal(response.status, 401);
    assert.equal(request.bodyUsed, false);
    assert.match(response.headers.get("cache-control")!, /no-store/);
  }
  assert.equal(
    (
      await login(
        new Request("https://undery.link/api/auth/github", { method: "POST" }),
      )
    ).status,
    503,
  );
  assert.equal(
    (
      await callback(
        new NextRequest(
          "https://undery.link/api/auth/github/callback?code=forged&state=forged",
        ),
      )
    ).status,
    503,
  );
  assert.equal(
    (
      await logout(
        new Request("https://undery.link/api/auth/logout", { method: "POST" }),
      )
    ).status,
    403,
  );
});
