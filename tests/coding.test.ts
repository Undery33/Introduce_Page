import { test } from "node:test";
import assert from "node:assert/strict";
import {
  codingCategories,
  codingListHref,
  filterCodingPosts,
  getCodingCategory,
  getCodingPosts,
  normalizeCodingQuery,
  type CodingPost,
} from "../src/lib/coding";

function post(slug: string, overrides: Partial<CodingPost> = {}): CodingPost {
  return {
    slug,
    title: "서버 설정",
    description: "시스템 운영을 위한 기록",
    category: "infrastructure",
    icon: "server",
    publishedAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    tags: [],
    sections: [],
    ...overrides,
  };
}

const slugs = (posts: readonly CodingPost[]) => posts.map((item) => item.slug);

test("categories match the design and reject unsupported URL values", () => {
  assert.deepEqual(
    codingCategories.map(({ id, label }) => ({ id, label })),
    [
      { id: "frontend", label: "FRONT-END" },
      { id: "backend", label: "BACK-END" },
      { id: "infrastructure", label: "SERVER-INFRA" },
      { id: "network", label: "NETWORK" },
    ],
  );
  assert.equal(getCodingCategory(" infrastructure ")?.id, "infrastructure");
  assert.equal(getCodingCategory(["network", "backend"])?.id, "network");
  for (const value of [undefined, "", "web", "unknown", "<script>", []]) {
    assert.equal(getCodingCategory(value), undefined);
  }
});

test("queries use the first parameter, trim, normalize Korean, and limit length", () => {
  assert.equal(normalizeCodingQuery(), "");
  assert.equal(normalizeCodingQuery([]), "");
  assert.equal(normalizeCodingQuery(["  DNS  ", "ignored"]), "DNS");
  assert.equal(normalizeCodingQuery(" \u1100\u1161\u11a8 "), "각");
  assert.equal(normalizeCodingQuery("  a".padEnd(110, "a")).length, 100);
  assert.equal(Array.from(normalizeCodingQuery("😀".repeat(101))).length, 100);
  assert.equal(normalizeCodingQuery("DNS & HTTPS"), "DNS & HTTPS");
});

test("the unconnected content adapter returns no sample or seeded records", async () => {
  assert.deepEqual(await getCodingPosts(), []);
  assert.deepEqual(filterCodingPosts([]), []);
  assert.deepEqual(
    filterCodingPosts([], { category: "infrastructure", query: "DNS" }),
    [],
  );
});

test("category and query filters combine without exposing other categories", () => {
  const posts = [
    post("dns-server", { title: "Ubuntu DNS 설정" }),
    post("dns-network", { title: "DNS 원리", category: "network" }),
    post("server-logs", { title: "서버 로그" }),
  ];
  assert.deepEqual(
    slugs(
      filterCodingPosts(posts, { category: "infrastructure", query: "dns" }),
    ),
    ["dns-server"],
  );
  assert.deepEqual(
    slugs(filterCodingPosts(posts, { category: "network", query: " dns " })),
    ["dns-network"],
  );
  assert.deepEqual(filterCodingPosts(posts, { query: "no matching text" }), []);
});

test("search matches titles, descriptions, tags, section text, and code", () => {
  const posts = [
    post("title", { title: "HTTPS 설정" }),
    post("description", { description: "HTTPS 연결" }),
    post("tag", { tags: ["HTTPS"] }),
    post("section-title", {
      sections: [{ id: "intro", title: "HTTPS 개요", paragraphs: [] }],
    }),
    post("paragraph", {
      sections: [{ id: "intro", title: "개요", paragraphs: ["HTTPS 설명"] }],
    }),
    post("code", {
      sections: [
        {
          id: "example",
          title: "예제",
          paragraphs: [],
          code: { language: "sh", value: "curl https://example.test" },
        },
      ],
    }),
    post("unmatched"),
  ];
  assert.deepEqual(slugs(filterCodingPosts(posts, { query: "hTtPs" })), [
    "code",
    "description",
    "paragraph",
    "section-title",
    "tag",
    "title",
  ]);
  assert.deepEqual(
    slugs(
      filterCodingPosts([post("korean", { title: "\u1100\u1161\u11a8" })], {
        query: "각",
      }),
    ),
    ["korean"],
  );
});

test("records sort by actual updated time and do not mutate the input", () => {
  const posts = Object.freeze([
    post("earlier", { updatedAt: "2026-10-06T10:00:00+09:00" }),
    post("invalid", { updatedAt: "not a date" }),
    post("latest-b", { updatedAt: "2026-10-06T02:00:00Z" }),
    post("latest-a", { updatedAt: "2026-10-06T02:00:00Z" }),
  ]);
  assert.deepEqual(slugs(filterCodingPosts(posts)), [
    "latest-a",
    "latest-b",
    "earlier",
    "invalid",
  ]);
  assert.deepEqual(slugs(posts), [
    "earlier",
    "invalid",
    "latest-b",
    "latest-a",
  ]);
});

test("list URLs encode search text without creating extra parameters or fragments", () => {
  assert.equal(codingListHref(), "/coding");
  assert.equal(codingListHref({ query: "   " }), "/coding");
  assert.equal(
    codingListHref({ category: "network" }),
    "/coding?category=network",
  );

  const query = "DNS & category=backend # 한글 + /?";
  const url = new URL(
    codingListHref({ category: "infrastructure", query: `  ${query}  ` }),
    "https://example.test",
  );
  assert.equal(url.pathname, "/coding");
  assert.equal(url.searchParams.get("category"), "infrastructure");
  assert.equal(url.searchParams.get("q"), query);
  assert.equal(url.searchParams.size, 2);
  assert.equal(url.hash, "");
});
