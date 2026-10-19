import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import sharp from "sharp";
import { getDatabase } from "../../src/lib/db";
import { randomToken, tokenHash } from "../../src/lib/admin/security";
import { legacyPhotos } from "../../src/lib/admin/photo-input";

// Authenticated HTTP coverage uses a disposable session in an explicit test DB.
// It never calls GitHub or uses the production browser's credentials.
test(
  "HTTP images, icon library, chapter navigation and VRChat draft/public isolation",
  { timeout: 120000 },
  async () => {
    const url = process.env.ADMIN_TEST_DATABASE_URL;
    assert.ok(
      url,
      "Set ADMIN_TEST_DATABASE_URL to a migrated dedicated test DB",
    );
    const parsed = new URL(url);
    assert.match(parsed.protocol, /^postgres(?:ql)?:$/);
    assert.match(parsed.pathname, /^\/[a-zA-Z0-9_]+_test$/);
    assert.equal(parsed.searchParams.has("schema"), false);
    process.env.DATABASE_URL = url;
    const db = getDatabase();
    const directory = await mkdtemp(join(tmpdir(), "undery-media-http-"));
    const token = randomToken(),
      csrf = randomToken();
    const sessionHash = tokenHash(token);
    const port = process.env.MEDIA_TEST_PORT || "3103";
    const base = `http://127.0.0.1:${port}`;
    const images: string[] = [],
      photos: string[] = [],
      drafts: string[] = [];
    // Keep the full UUID while exercising the API's 40-character boundary.
    const iconLabel = `test${randomUUID()}`;
    assert.equal(iconLabel.length, 40);
    let server: ReturnType<typeof spawn> | undefined;
    let checks = 0;
    async function request(
      path: string,
      status: number,
      init: RequestInit = {},
      admin = false,
    ) {
      const response = await fetch(base + path, {
        ...init,
        headers: {
          ...(admin
            ? {
                Cookie: `__Host-undery-session=${token}`,
                Origin: "https://undery.link",
                "X-CSRF-Token": csrf,
              }
            : {}),
          ...init.headers,
        },
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
      assert.equal(response.status, status, `${init.method ?? "GET"} ${path}`);
      checks++;
      return response;
    }
    const mutate = async (
      path: string,
      body: unknown,
      method = "POST",
      status = 200,
    ) =>
      (
        await request(
          path,
          status,
          {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
          true,
        )
      ).json();
    const markup = (html: string) =>
      html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
    try {
      await db.adminSession.create({
        data: {
          tokenHash: sessionHash,
          githubUserId: "127064386",
          csrfToken: csrf,
          expiresAt: new Date(Date.now() + 600000),
        },
      });
      server = spawn(process.execPath, [".next/standalone/server.js"], {
        stdio: "ignore",
        env: {
          ...process.env,
          DATABASE_URL: url,
          NODE_ENV: "production",
          HOSTNAME: "127.0.0.1",
          PORT: port,
          SITE_URL: "https://undery.link",
          GITHUB_CLIENT_ID: "test-only",
          GITHUB_CLIENT_SECRET: "test-only",
          ADMIN_GITHUB_ID: "127064386",
          MEDIA_DIRECTORY: directory,
        },
      });
      let started = false;
      for (let i = 0; i < 40; i++) {
        if (server.exitCode !== null)
          throw new Error("Isolated HTTP server failed to start");
        try {
          const response = await fetch(base + "/api/health", {
            signal: AbortSignal.timeout(1000),
          });
          if (response.ok) {
            started = true;
            break;
          }
        } catch {
          /* Startup only. */
        }
        await delay(250);
      }
      assert.ok(started, "Isolated test server must become healthy");
      for (const color of ["red", "blue"]) {
        const bytes = await sharp({
          create: { width: 16, height: 8, channels: 3, background: color },
        })
          .png()
          .toBuffer();
        if (!images.length) {
          await request("/api/admin/images", 401, {
            method: "POST",
            headers: { "Content-Type": "image/png" },
            body: new Uint8Array(bytes),
          });
          await request(
            "/api/admin/images",
            401,
            {
              method: "POST",
              headers: {
                "Content-Type": "image/png",
                Origin: "https://other.example",
              },
              body: new Uint8Array(bytes),
            },
            true,
          );
          await request(
            "/api/admin/images",
            401,
            {
              method: "POST",
              headers: {
                "Content-Type": "image/png",
                "X-CSRF-Token": "forged",
              },
              body: new Uint8Array(bytes),
            },
            true,
          );
        }
        const result = await (
          await request(
            "/api/admin/images",
            201,
            {
              method: "POST",
              headers: { "Content-Type": "image/png" },
              body: new Uint8Array(bytes),
            },
            true,
          )
        ).json();
        images.push(result.id);
        const privateImage = await request(result.url, 200, {}, true);
        assert.match(privateImage.headers.get("content-type")!, /image\/webp/);
        assert.match(privateImage.headers.get("cache-control")!, /no-store/);
        await request(result.url, 404);
      }
      const first = `/media/${images[0]}.webp`,
        second = `/media/${images[1]}.webp`;
      const invalidIcon = await mutate(
        "/api/admin/icons",
        { label: `${iconLabel}x`, url: first },
        "POST",
        400,
      );
      assert.equal(
        invalidIcon.error,
        "아이콘 이름(1~40자)과 이미지를 확인하십시오.",
      );
      await mutate(
        "/api/admin/icons",
        { label: iconLabel, url: first },
        "POST",
        201,
      );
      assert.ok(
        (
          await (await request("/admin/posts/new", 200, {}, true)).text()
        ).includes(iconLabel),
      );
      const slug = `media-check-${randomUUID()}`;
      const input = {
        slug,
        title: "HTTP chapter check",
        description: "검사",
        category: "backend",
        icon: first,
        tags: [],
        sections: [
          {
            id: "one",
            title: "첫 챕터",
            markdown: `FIRST_CHAPTER\n\n![사진](${first})`,
          },
          { id: "two", title: "둘째 챕터", markdown: "SECOND_CHAPTER" },
        ],
      };
      let post = await mutate("/api/admin/posts", input, "POST", 201);
      drafts.push(post.id);
      await request(`/coding/${slug}`, 404);
      post = await mutate(`/api/admin/posts/${post.id}/publish`, {
        version: post.version,
      });
      const pageOne = markup(
        await (await request(`/coding/${slug}`, 200)).text(),
      );
      assert.match(pageOne, /FIRST_CHAPTER/);
      assert.doesNotMatch(pageOne, /SECOND_CHAPTER/);
      assert.ok(pageOne.includes(`/coding/${slug}?section=two`));
      assert.match(pageOne, /다음/);
      const pageTwo = markup(
        await (await request(`/coding/${slug}?section=two`, 200)).text(),
      );
      assert.match(pageTwo, /SECOND_CHAPTER/);
      assert.doesNotMatch(pageTwo, /FIRST_CHAPTER/);
      assert.ok(pageTwo.includes(`/coding/${slug}?section=one`));
      assert.match(pageTwo, /이전/);
      await request(first, 200);
      post = await mutate(`/api/admin/posts/${post.id}/unpublish`, {
        version: post.version,
      });
      await request(first, 404);
      const photoInput = {
        title: "HTTP photo original",
        description: "original-visible",
        src: first,
        month: "2026-10",
        tags: ["Photo"],
        position: "50% 50%",
        order: 0,
        showOnHome: true,
      };
      let photo = await mutate("/api/admin/photos", photoInput, "POST", 201);
      photos.push(photo.id);
      assert.doesNotMatch(
        markup(await (await request("/game/vrchat/photo", 200)).text()),
        /original-visible/,
      );
      photo = await mutate(`/api/admin/photos/${photo.id}/publish`, {
        version: photo.version,
      });
      await request(first, 200);
      assert.match(
        markup(await (await request("/game/vrchat/photo", 200)).text()),
        /original-visible/,
      );
      assert.match(
        markup(await (await request("/game/vrchat", 200)).text()),
        /HTTP photo original/,
      );
      const oldVersion = photo.version;
      photo = await mutate(
        `/api/admin/photos/${photo.id}`,
        {
          ...photoInput,
          src: second,
          title: "private-draft-title",
          description: "private-draft-description",
          version: photo.version,
        },
        "PUT",
      );
      await mutate(
        `/api/admin/photos/${photo.id}`,
        { ...photoInput, version: oldVersion },
        "PUT",
        409,
      );
      const publicArchive = markup(
        await (await request("/game/vrchat/photo", 200)).text(),
      );
      assert.match(publicArchive, /original-visible/);
      assert.doesNotMatch(publicArchive, /private-draft-description/);
      await request(second, 404);
      photo = await mutate(`/api/admin/photos/${photo.id}/publish`, {
        version: photo.version,
      });
      await request(first, 404);
      await request(second, 200);
      photo = await mutate(`/api/admin/photos/${photo.id}/unpublish`, {
        version: photo.version,
      });
      await request(second, 404);
      const existingIds = new Set(
        (await db.vrchatPhoto.findMany({ select: { id: true } })).map(
          (row) => row.id,
        ),
      );
      const legacy = legacyPhotos.find((item) => !existingIds.has(item.id));
      assert.ok(
        legacy,
        "A previously untouched legacy photo is needed for first-edit preservation check",
      );
      let edited = await mutate(
        `/api/admin/photos/${legacy.id}`,
        { ...legacy, title: "legacy-private-draft" },
        "PUT",
      );
      photos.push(edited.id);
      const originalHome = markup(
        await (await request("/game/vrchat/photo", 200)).text(),
      );
      assert.ok(originalHome.includes(legacy.description));
      assert.doesNotMatch(originalHome, /legacy-private-draft/);
      edited = await mutate(`/api/admin/photos/${edited.id}/publish`, {
        version: edited.version,
      });
      await mutate(`/api/admin/photos/${edited.id}/unpublish`, {
        version: edited.version,
      });
      const hiddenArchive = markup(
        await (await request("/game/vrchat/photo", 200)).text(),
      );
      assert.ok(!hiddenArchive.includes(legacy.description));
      await request(
        "/api/auth/logout",
        303,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ csrfToken: csrf }),
        },
        true,
      );
      await request("/admin/photos", 307, {}, true);
      await request(second, 404, {}, true);
      console.log(
        `PASS: ${checks} authenticated media HTTP checks; uploads, CSRF, private images, custom icon reuse, chapter next/previous, photo drafts/replacement/publication, legacy preservation, unpublish and logout.`,
      );
    } finally {
      if (server && server.exitCode === null) {
        server.kill("SIGTERM");
        await Promise.race([
          new Promise((resolve) => server!.once("exit", resolve)),
          delay(3000),
        ]);
        if (server.exitCode === null) {
          server.kill("SIGKILL");
          await new Promise((resolve) => server!.once("exit", resolve));
        }
      }
      const rows = await db.codingPostDraft.findMany({
        where: { id: { in: drafts } },
        select: { postId: true },
      });
      await db.$transaction([
        db.codingPostDraft.deleteMany({ where: { id: { in: drafts } } }),
        db.codingPost.deleteMany({
          where: {
            id: { in: rows.flatMap((row) => (row.postId ? [row.postId] : [])) },
          },
        }),
        db.vrchatPhoto.deleteMany({ where: { id: { in: photos } } }),
        db.customIcon.deleteMany({ where: { label: iconLabel } }),
        db.uploadedImage.deleteMany({ where: { id: { in: images } } }),
        db.adminSession.deleteMany({ where: { tokenHash: sessionHash } }),
      ]);
      await db.$disconnect();
      await rm(directory, { recursive: true, force: true });
    }
  },
);
