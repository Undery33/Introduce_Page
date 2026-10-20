import assert from "node:assert/strict";
import test from "node:test";
import {
  parsePostInput,
  parseVersion,
  assertPublishable,
} from "../src/lib/admin/post-input";
import { readJson } from "../src/lib/admin/http";
const input = {
  slug: "linux-dns",
  title: "DNS 실습",
  description: "요약",
  category: "infrastructure",
  icon: "server",
  tags: ["DNS", "dns", "Linux"],
  sections: [
    { id: "install", title: "설치", markdown: "```bash\ndig example.com\n```" },
  ],
};
test("editor input preserves explicit chapters and normalizes duplicate tags", () => {
  const parsed = parsePostInput({
    ...input,
    status: "PUBLISHED",
    role: "admin",
  });
  assert.deepEqual(parsed.tags, ["DNS", "Linux"]);
  assert.equal(parsed.sections[0].id, "install");
  assert.equal("status" in parsed, false);
  assert.equal("role" in parsed, false);
});
test("invalid categories, addresses, duplicate chapter IDs and oversized input are rejected", () => {
  for (const change of [
    { slug: "../admin" },
    { slug: "<script>" },
    { category: "WEB" },
    { category: "PROGRAMMING" },
    { title: " " },
    { sections: [] },
    { sections: [input.sections[0], input.sections[0]] },
    { tags: ["x".repeat(31)] },
  ])
    assert.throws(() => parsePostInput({ ...input, ...change }));
  assert.throws(() => parseVersion({ version: -1 }));
  assert.throws(() => parseVersion({ version: "1" }));
  assert.equal(parseVersion({ version: 4 }), 4);
});
test("empty draft bodies may be saved but never published", () => {
  const draft = parsePostInput({
    ...input,
    sections: [{ id: "body", title: "본문", markdown: "" }],
  });
  assert.throws(() => assertPublishable(draft), /본문/);
  assert.doesNotThrow(() => assertPublishable(parsePostInput(input)));
});
test("JSON parser bounds actual streamed bytes even without content-length", async () => {
  await assert.rejects(
    readJson(
      new Request("https://example.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "x".repeat(262144) }),
      }),
    ),
    /초과/,
  );
  await assert.rejects(
    readJson(
      new Request("https://example.com", { method: "POST", body: "{}" }),
    ),
    /JSON/,
  );
  assert.deepEqual(
    await readJson(
      new Request("https://example.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"title":"한글"}',
      }),
    ),
    { title: "한글" },
  );
});
