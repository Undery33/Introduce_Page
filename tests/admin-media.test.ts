import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  normalizeImage,
  readImageBytes,
} from "../src/lib/admin/image-processing";
import { bodyBlocks, imageMarkdown } from "../src/lib/markdown-blocks";
import { imageIdFromUrl, MAX_IMAGE_BYTES } from "../src/lib/media";
import { parsePostInput } from "../src/lib/admin/post-input";
import {
  legacyPhotos,
  parsePhotoInput,
  publicPhoto,
} from "../src/lib/admin/photo-input";
import { POST as upload } from "../src/app/api/admin/images/route";
import { POST as icon } from "../src/app/api/admin/icons/route";
import { POST as createPhoto } from "../src/app/api/admin/photos/route";
import { PUT as savePhoto } from "../src/app/api/admin/photos/[id]/route";
import { POST as publishPhoto } from "../src/app/api/admin/photos/[id]/publish/route";
import { POST as unpublishPhoto } from "../src/app/api/admin/photos/[id]/unpublish/route";

test("image pipeline rejects active content and truncation; orients pixels and removes EXIF", async () => {
  const png = await sharp({
    create: { width: 8, height: 4, channels: 4, background: "#ff000080" },
  })
    .png()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await normalizeImage(png);
  const metadata = await sharp(result.data).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 4);
  assert.equal(metadata.height, 8);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined);
  assert.equal(metadata.hasAlpha, true);
  await assert.rejects(
    normalizeImage(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      ),
    ),
    { status: 415 },
  );
  await assert.rejects(normalizeImage(png.subarray(0, 16)), { status: 400 });
});
test("upload byte limit checks actual chunks without trusting content-length", async () => {
  await assert.rejects(
    readImageBytes(
      new Request("https://undery.link", {
        method: "POST",
        headers: { "Content-Type": "image/png", "Content-Length": "1" },
        body: new Uint8Array(MAX_IMAGE_BYTES + 1),
      }),
    ),
    { status: 413 },
  );
  await assert.rejects(
    readImageBytes(
      new Request("https://undery.link", {
        method: "POST",
        headers: { "Content-Type": "image/svg+xml" },
        body: "<svg/>",
      }),
    ),
    { status: 415 },
  );
});
test("visual body image blocks preserve Korean, blank lines, CRLF and fenced code", () => {
  const url = "/media/0123456789abcdef0123456789abcdef.webp";
  const source =
    "설명 한글\r\n\r\n" +
    imageMarkdown(url, "사진") +
    "\r\n\r\n다음\n\n```md\n![코드](https://example.com/a.png)\n```\n";
  const blocks = bodyBlocks(source);
  assert.equal(blocks.map((block) => block.value).join(""), source);
  assert.equal(blocks.filter((block) => block.kind === "image").length, 1);
  assert.match(blocks.at(-1)!.value, /!\[코드\]/);
  assert.equal(bodyBlocks("![x](javascript:alert)")[0].kind, "text");
  assert.equal(imageIdFromUrl(url), "0123456789abcdef0123456789abcdef");
  for (const value of [
    "/media/../secret",
    "//evil/image.webp",
    "/media/a.svg",
    "/media/0123456789abcdef0123456789abcdef.webp?x=1",
  ])
    assert.equal(imageIdFromUrl(value), null);
  const post = {
    slug: "custom-icon",
    title: "제목",
    description: "",
    category: "backend",
    icon: url,
    tags: [],
    sections: [{ id: "body", title: "본문", markdown: source }],
  };
  assert.equal(parsePostInput(post).icon, url);
  assert.throws(() =>
    parsePostInput({ ...post, icon: "https://evil.example/icon.svg" }),
  );
});
test("VRChat input uses known images, bounded layout, and public fields only", () => {
  const photo = legacyPhotos[0];
  const parsed = parsePhotoInput({ ...photo, month: "2026-10" });
  assert.equal(parsed.month, "2026-10");
  for (const change of [
    { month: "2026-13" },
    { position: "url(https://evil)" },
    { src: "/etc/passwd" },
    { tags: ["Admin"] },
    { order: -1 },
  ])
    assert.throws(() => parsePhotoInput({ ...photo, ...change }));
  const visible = publicPhoto(photo.id, photo);
  for (const key of ["version", "publishedVersion", "publicStatus", "draft"])
    assert.equal(key in visible, false);
});
test("all new mutations reject unauthenticated requests before reading image or JSON bytes", async (t) => {
  const original = process.env.GITHUB_CLIENT_SECRET;
  delete process.env.GITHUB_CLIENT_SECRET;
  t.after(() => {
    if (original === undefined) delete process.env.GITHUB_CLIENT_SECRET;
    else process.env.GITHUB_CLIENT_SECRET = original;
  });
  for (const handler of [
    upload,
    icon,
    createPhoto,
    savePhoto,
    publishPhoto,
    unpublishPhoto,
  ]) {
    const request = new Request("https://undery.link/api/admin/images", {
      method: "POST",
      body: "untrusted",
    });
    const result = await handler(request, {
      params: Promise.resolve({ id: "forged" }),
    });
    assert.equal(result.status, 401);
    assert.equal(request.bodyUsed, false);
  }
});
