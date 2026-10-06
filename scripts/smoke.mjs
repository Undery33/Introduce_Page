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
function bodyMarkup(html) {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  assert.ok(body, "Response has a rendered body");
  return body[1].replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
}
function assertComingSoon(html, path) {
  // Serialized React payloads are not rendered UI and must not satisfy these checks.
  const markup = bodyMarkup(html);
  assert.match(markup, /<main\b[^>]*>/, `${path}: main landmark`);
  assert.match(markup, /<h1\b[^>]*>준비 중<\/h1>/, `${path}: heading`);
  assert.doesNotMatch(
    markup,
    /<(header|footer|form|a)\b/i,
    `${path}: no extra UI`,
  );
  assert.equal(
    markup.replace(/<!--[\s\S]*?-->|<[^>]*>/g, "").trim(),
    "준비 중",
    `${path}: only the requested placeholder text is rendered`,
  );
}
function assertCodingArchive(html, path) {
  const markup = bodyMarkup(html);
  const params = new URL(path, origin).searchParams;
  const category = params.get("category");
  const query = params.get("q") || "";
  assert.match(markup, /<main\b[^>]*\bid="coding-content"[^>]*>/);
  const sidebar = markup.match(/<aside\b[^>]*>([\s\S]*?)<\/aside>/)?.[1];
  assert.ok(sidebar, `${path}: coding sidebar exists`);
  const brand = [...sidebar.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].find(
    ([anchor]) => /<img\b/.test(anchor),
  )?.[0];
  assert.ok(brand, `${path}: existing brand image remains visible`);
  assert.match(brand, /\bhref="\/coding"/);
  assert.match(
    brand.replace(/<!--[\s\S]*?-->|<[^>]*>/g, " "),
    /\|\s*Coding/,
    `${path}: Coding label appears beside the logo`,
  );
  const rootLinks = [...markup.matchAll(/<a\b[^>]*\bhref="\/"[^>]*>/g)];
  let rootHeadingLink;
  if (category) {
    const labels = {
      frontend: "FRONT-END",
      backend: "BACK-END",
      infrastructure: "SERVER-INFRA",
      network: "NETWORK",
    };
    const label = labels[category];
    assert.ok(label, `${path}: supported category`);
    const heading = markup.match(
      /<h1\b[^>]*\bid="coding-heading"[^>]*>([\s\S]*?)<\/h1>/,
    )?.[1];
    assert.ok(heading, `${path}: category heading exists`);
    rootHeadingLink = heading.match(/<a\b[^>]*\bhref="\/"[^>]*>/)?.[0];
    assert.ok(rootHeadingLink, `${path}: category title links to the homepage`);
    assert.ok(
      rootHeadingLink.includes(`aria-label="${label} · 메인 홈페이지로"`),
      `${path}: category homepage link has a descriptive name`,
    );
    assert.equal(
      rootLinks.length,
      1,
      `${path}: only the category title links home`,
    );
    assert.equal(rootLinks[0][0], rootHeadingLink);
  } else {
    assert.equal(rootLinks.length, 0, `${path}: no additional homepage links`);
  }
  assert.ok(
    markup.includes(
      query ? "검색 결과가 없습니다." : "아직 등록된 자료가 없습니다.",
    ),
    `${path}: correct empty state`,
  );
  assert.doesNotMatch(
    markup,
    /Ubuntu에서의 DNS|Rocky에서의 DNS|<a\b[^>]*href="\/coding\/[^"?#]+"/,
    `${path}: no example articles are published`,
  );
  const search = [...markup.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].find(
    ([form]) => /\brole="search"/.test(form),
  )?.[0];
  assert.ok(search, `${path}: search form exists`);
  assert.match(search, /\baction="\/coding"/);
  assert.doesNotMatch(search, /\bmethod="(?!get")/i);
  const input = [...search.matchAll(/<input\b[^>]*>/g)].find(([field]) =>
    /\bname="q"/.test(field),
  )?.[0];
  assert.ok(input, `${path}: search query input exists`);
  const escapedQuery = query
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  assert.ok(
    input.includes(`value="${escapedQuery}"`),
    `${path}: search input preserves and escapes the query`,
  );
  const categoryInput = [...search.matchAll(/<input\b[^>]*>/g)].find(
    ([field]) => /\bname="category"/.test(field),
  )?.[0];
  if (category) {
    assert.ok(categoryInput, `${path}: category persists on search`);
    assert.match(categoryInput, /\btype="hidden"/);
    assert.ok(categoryInput.includes(`value="${category}"`));
  } else {
    assert.equal(categoryInput, undefined);
  }
  const activeLinks = [...markup.matchAll(/<a\b[^>]*>/g)].filter(([anchor]) =>
    /\baria-current="page"/.test(anchor),
  );
  assert.equal(activeLinks.length, 1, `${path}: one selected navigation item`);
  const href = activeLinks[0][0].match(/\bhref="([^"]+)"/)?.[1];
  assert.ok(href);
  const activeUrl = new URL(href.replaceAll("&amp;", "&"), origin);
  assert.equal(activeUrl.pathname, "/coding");
  assert.equal(activeUrl.searchParams.get("category"), category);
  if (query) {
    const clearLinks = [...markup.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].filter(
      ([anchor]) => anchor.includes("검색어 지우기"),
    );
    assert.ok(clearLinks.length > 0, `${path}: search can be cleared`);
    for (const [anchor] of clearLinks) {
      const clearHref = anchor.match(/\bhref="([^"]+)"/)?.[1];
      assert.ok(clearHref);
      const clearUrl = new URL(clearHref.replaceAll("&amp;", "&"), origin);
      assert.equal(clearUrl.pathname, "/coding");
      assert.equal(clearUrl.searchParams.get("category"), category);
      assert.equal(clearUrl.searchParams.get("q"), null);
    }
  }
  return rootHeadingLink;
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
  for (const path of ["/", "/?from=profile"]) {
    const response = await request(path, 200);
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("refresh"), null);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const html = await response.text();
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
    assert.ok(canonical, "Root canonical is present");
    assert.equal(new URL(canonical[1]).href, "https://undery.link/");
    assert.doesNotMatch(html, /<meta\b[^>]*http-equiv="refresh"/i);
    for (const section of ["whoami", "game", "coding"])
      assert.match(html, new RegExp(`<a\\b[^>]*href="/${section}"`));
    await request(path, 200, { method: "HEAD" });
  }
  const rootSitemap = await (await request("/sitemap.xml", 200)).text();
  assert.deepEqual(
    [...rootSitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]),
    ["https://undery.link/"],
  );
  await request("/sitemap.xml", 200, { method: "HEAD" });
  for (const path of [
    "/index",
    "/index.html",
    "/develop",
    "/develop/example",
    "/blog",
    "/blog/daily",
    "/blog/message",
    "/blog/qa",
    "/unknown",
  ]) {
    const html = await (await request(path, 404)).text();
    assertComingSoon(html, path);
    await request(path, 404, { method: "HEAD" });
  }
  for (const path of [
    "/coding",
    "/coding?q=test&category=network",
    ...["frontend", "backend", "infrastructure", "network"].map(
      (category) => `/coding?category=${category}`,
    ),
    "/game",
    "/game/highlights",
    "/game/valorant",
    "/game/gallery",
    "/game/vrchat",
    "/game/vrchat/photo",
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
    const rootHeadingLink =
      section === "coding" ? assertCodingArchive(html, path) : undefined;
    if (path === "/game") {
      const choices = [...html.matchAll(/<a\b[^>]*data-game="([^"]+)"[^>]*>/g)];
      assert.equal(choices.length, 2, "Game selector has exactly two choices");
      assert.deepEqual(
        choices.map((choice) => ({
          game: choice[1],
          href: choice[0].match(/\bhref="([^"]+)"/)?.[1],
        })),
        [
          { game: "valorant", href: "/game/highlights" },
          { game: "vrchat", href: "/game/vrchat" },
        ],
        "Game choices preserve the left VALORANT / right VRChat order and destinations",
      );
      for (const label of [
        "VALORANT",
        "VRCHAT",
        "하이라이트 보기",
        "스토리 보기",
      ])
        assert.ok(html.includes(label), `Game selector label: ${label}`);
      assert.match(
        html,
        /<meta property="og:image" content="[^"]*\/game\/opengraph-image/,
      );
    }
    if (
      path === "/whoami" ||
      path === "/game/highlights" ||
      path === "/game/valorant" ||
      path === "/game/gallery"
    )
      assertComingSoon(html, path);
    if (path === "/game/vrchat") {
      const markup = bodyMarkup(html);
      const allPhotos = markup.match(/<a\b[^>]*\bid="all-photos"[^>]*>/)?.[0];
      assert.ok(allPhotos, "VRChat photo archive uses a link");
      assert.match(allPhotos, /\bhref="\/game\/vrchat\/photo"/);
      const anotherGame = markup.match(/<a\b[^>]*\bid="game-grid"[^>]*>/)?.[0];
      assert.ok(anotherGame, "VRChat Another Game banner uses a link");
      assert.match(anotherGame, /\bhref="\/game\/valorant"/);
      for (const id of [
        "site-title",
        "photos",
        "photo-heading",
        "photo-grid",
        "social-heading",
        "thanks-heading",
        "games-heading",
        "profile-button",
        "all-photos",
        "photo-dialog",
        "profile-dialog",
        "notice-dialog",
      ])
        assert.match(
          markup,
          new RegExp(`\\bid="${id}"`),
          `VRChat draft: ${id}`,
        );
    }
    if (path === "/game/vrchat/photo") {
      const markup = bodyMarkup(html);
      assert.match(
        markup,
        /<main\b[^>]*>/,
        "Photo archive has a main landmark",
      );
      assert.match(
        markup,
        /<h1\b[^>]*\baria-label="PHOTO"[^>]*>/,
        "Photo archive heading",
      );
      assert.match(markup, /<select\b[^>]*\bname="month"[^>]*>/);
      assert.match(markup, /\baria-label="태그"/);
      assert.match(markup, /<a\b[^>]*\bhref="\/game\/vrchat"[^>]*>/);
      for (const tag of ["ALL", "World", "Character", "Photo", "Video"])
        assert.match(
          markup,
          new RegExp(`<button\\b[^>]*>\\s*${tag}\\s*</button>`),
          `Photo archive tag control: ${tag}`,
        );
      assert.equal(
        [...markup.matchAll(/\bdata-photo-card(?:=|\s|>)/g)].length,
        6,
        "Photo archive initially displays the six existing photos",
      );
    }
    for (const [anchor, href] of bodyMarkup(html).matchAll(
      /<a\b[^>]*href="([^"]+)"[^>]*>/g,
    )) {
      if (
        !href.startsWith("/") ||
        href === "/privacy" ||
        href.startsWith("/images/vrchat/")
      )
        continue;
      // The user-authorized homepage exit is only the category title above.
      if (href === "/" && anchor === rootHeadingLink) continue;
      assert.ok(
        href === `/${section}` ||
          href.startsWith(`/${section}/`) ||
          href.startsWith(`/${section}#`) ||
          href.startsWith(`/${section}?`),
        `Cross-section link ${path} -> ${href}`,
      );
    }
  }
  const escapedSearchPath = `/coding?category=infrastructure&q=${encodeURIComponent('<svg onload="alert(1)"> & DNS')}`;
  const escapedSearch = await (await request(escapedSearchPath, 200)).text();
  assertCodingArchive(escapedSearch, escapedSearchPath);
  assert.doesNotMatch(bodyMarkup(escapedSearch), /<svg\s+onload=/i);
  for (const section of ["coding", "game", "whoami"]) {
    const missing = await (
      await request(`/${section}/does-not-exist`, 404)
    ).text();
    // Next streams dynamic not-found content in its React payload. The actual
    // rendered placeholder for these paths is verified in the browser.
    assert.ok(
      missing.includes(
        section === "coding" ? "자료를 찾을 수 없습니다." : "준비 중",
      ),
    );
    const xml = await (await request(`/${section}/sitemap.xml`, 200)).text();
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(
      (match) => new URL(match[1]),
    );
    if (section === "game") {
      assert.ok(
        urls.some((url) => url.pathname === "/game/vrchat/photo"),
        "Game sitemap includes the photo archive",
      );
      assert.ok(
        urls.some((url) => url.pathname === "/game/valorant"),
        "Game sitemap includes VALORANT",
      );
    }
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
  assertComingSoon(whoami, "/whoami");
  assert.doesNotMatch(whoami, /INTJ|ENFP|privateToken/);
  const privacy = await (await request("/privacy", 200)).text();
  assertComingSoon(privacy, "/privacy");
  const admin = await (await request("/admin", 200)).text();
  assertComingSoon(admin, "/admin");
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
    `PASS: ${assertions} HTTP checks; root selection page, coding archive empty states and escaped search, two-game selector, restored VRChat draft and photo archive, coming-soon pages, section isolation, metadata, sitemaps, unsupported-route 404s and closed write APIs.`,
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
