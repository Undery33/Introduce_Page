import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const external = process.env.SMOKE_BASE_URL;
const port = process.env.SMOKE_PORT || "3101";
const origin = external || `http://127.0.0.1:${port}`;
let log = "";
const server = external
  ? null
  : spawn(process.execPath, [".next/standalone/server.js"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: port },
    });
server?.stdout.on("data", (data) => {
  log = (log + data).slice(-4000);
});
server?.stderr.on("data", (data) => {
  log = (log + data).slice(-4000);
});
let assertions = 0;
async function request(path, status, options = {}) {
  const response = await fetch(origin + path, {
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
    ...options,
  });
  assert.equal(response.status, status, `${options.method || "GET"} ${path}`);
  assertions++;
  return response;
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server && server.exitCode !== null)
      throw new Error(`Server exited: ${log}`);
    try {
      const response = await fetch(origin + "/api/health", {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(250);
  }
  assert.ok(ready, `Server did not become ready: ${log}`);
  for (const path of [
    "/",
    "/?from=profile",
    "/index",
    "/index.html",
    "/develop",
    "/develop/example",
    "/blog",
    "/blog/daily",
    "/blog/message",
    "/blog/qa",
    "/unknown",
    "/sitemap.xml",
  ]) {
    const html = await (await request(path, 404)).text();
    assert.doesNotMatch(html, /<a\b[^>]*href="\/(?:coding|game|whoami|)"/);
    await request(path, 404, { method: "HEAD" });
  }
  for (const path of [
    "/coding",
    "/coding?q=test&category=network",
    "/game",
    "/game/highlights",
    "/game/gallery",
    "/whoami",
  ]) {
    const response = await request(path, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const html = await response.text();
    const section = path.split("/")[1].split("?")[0];
    assert.match(
      html,
      new RegExp(
        `<link rel="canonical" href="https://undery.link${path.split("?")[0]}"`,
      ),
    );
    for (const [, href] of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
      if (!href.startsWith("/") || href === "/privacy") continue;
      assert.ok(
        href === `/${section}` ||
          href.startsWith(`/${section}/`) ||
          href.startsWith(`/${section}#`) ||
          href.startsWith(`/${section}?`),
        `Cross-section link ${path} -> ${href}`,
      );
    }
  }
  for (const section of ["coding", "game", "whoami"]) {
    const missing = await (
      await request(`/${section}/does-not-exist`, 404)
    ).text();
    // Next serializes dynamic not-found UI in the RSC payload; browser checks
    // separately verify the hydrated return link and its exact destination.
    assert.ok(missing.includes("시작 페이지로"));
    const xml = await (await request(`/${section}/sitemap.xml`, 200)).text();
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(
      (match) => new URL(match[1]),
    );
    assert.ok(urls.length > 0);
    for (const url of urls)
      assert.ok(
        url.pathname === `/${section}` ||
          url.pathname.startsWith(`/${section}/`),
      );
    const redirect = await request(`/${section}/?test=1`, 308);
    assert.equal(redirect.headers.get("location"), `/${section}?test=1`);
    const image = await request(`/${section}/opengraph-image`, 200);
    assert.match(image.headers.get("content-type"), /image\/png/);
  }
  const whoami = await (await request("/whoami", 200)).text();
  let previous = -1;
  for (const id of ["intro", "profile", "skills", "strengths", "comments"]) {
    const current = whoami.indexOf(`id="${id}"`);
    assert.ok(current > previous, `Whoami section order: ${id}`);
    previous = current;
  }
  assert.match(whoami, /<fieldset[^>]*disabled/);
  assert.doesNotMatch(whoami, /INTJ|ENFP|privateToken/);
  const privacy = await (await request("/privacy", 200)).text();
  assert.doesNotMatch(privacy, /<a\b[^>]*href="\/(coding|game|whoami)/);
  await request("/admin", 200);
  for (const path of ["/api/admin/posts", "/api/comments", "/api/upload"])
    await request(path, 404, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"role":"admin"}',
    });
  const healthResponse = await request("/api/health", 200);
  assert.equal(healthResponse.headers.get("cache-control"), "no-store");
  const health = await healthResponse.json();
  assert.equal(health.checks.database, "not-connected");
  assert.equal(health.checks.authentication, "not-configured");
  if (process.env.EXPECTED_COMMIT)
    assert.equal(health.commit, process.env.EXPECTED_COMMIT);
  const robots = await (await request("/robots.txt", 200)).text();
  assert.match(robots, /Disallow: \//);
  assert.doesNotMatch(robots, /Sitemap:/);
  console.log(
    `PASS: ${assertions} HTTP checks; section isolation, metadata, sitemaps, root 404, privacy and closed write APIs.`,
  );
} finally {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      delay(5000),
    ]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
}
