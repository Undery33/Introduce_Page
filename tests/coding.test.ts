import { test } from "node:test";
import assert from "node:assert/strict";
import {
  codingCategories,
  codingListHref,
  filterCodingPosts,
  getCodingCategory,
  normalizeCodingQuery,
  type CodingPost,
} from "../src/lib/coding";
import {
  getCodingPosts,
  isCodingPreviewEnabled,
} from "../src/lib/coding-store";

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

async function inCodingEnvironment(
  environment: { NODE_ENV?: string; CODING_PREVIEW?: string },
  run: () => Promise<void>,
) {
  const original = process.env;
  process.env = { ...original };
  Reflect.deleteProperty(process.env, "NODE_ENV");
  Reflect.deleteProperty(process.env, "CODING_PREVIEW");
  Object.assign(process.env, environment);
  try {
    await run();
  } finally {
    process.env = original;
  }
}

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
  await inCodingEnvironment({}, async () => {
    assert.deepEqual(await getCodingPosts(), []);
  });
  assert.deepEqual(filterCodingPosts([]), []);
  assert.deepEqual(
    filterCodingPosts([], { category: "infrastructure", query: "DNS" }),
    [],
  );
});

test("preview requires both development mode and the exact opt-in flag", () => {
  assert.equal(
    isCodingPreviewEnabled({ NODE_ENV: "development", CODING_PREVIEW: "1" }),
    true,
  );
  for (const environment of [
    {},
    { NODE_ENV: "development" },
    { CODING_PREVIEW: "1" },
    { NODE_ENV: "development", CODING_PREVIEW: "0" },
    { NODE_ENV: "development", CODING_PREVIEW: "true" },
    { NODE_ENV: "development", CODING_PREVIEW: " 1 " },
    { NODE_ENV: "production", CODING_PREVIEW: "1" },
    { NODE_ENV: "test", CODING_PREVIEW: "1" },
  ]) {
    assert.equal(isCodingPreviewEnabled(environment), false);
  }
});

test("enabled development preview supplies labeled DNS examples and chapter content", async () => {
  await inCodingEnvironment(
    { NODE_ENV: "development", CODING_PREVIEW: "1" },
    async () => {
      const examples = await getCodingPosts();
      assert.deepEqual(slugs(examples), [
        "example-ubuntu-dns",
        "example-rocky-dns",
        "example-dns",
      ]);
      assert.deepEqual(
        slugs(
          filterCodingPosts(examples, {
            category: "infrastructure",
            query: "DNS",
          }),
        ),
        ["example-ubuntu-dns", "example-rocky-dns"],
      );
      assert.deepEqual(
        slugs(
          filterCodingPosts(examples, { category: "network", query: "DNS" }),
        ),
        ["example-dns"],
      );
      for (const example of examples) {
        assert.equal(example.isExample, true);
        assert.deepEqual(
          example.sections.map((section) => section.title),
          ["개요", "DNS 패키지 설치", "설정 확인"],
        );
        assert.equal(
          new Set(example.sections.map((section) => section.id)).size,
          3,
        );
        assert.ok(
          example.sections.every(
            (section) =>
              section.paragraphs.length > 0 &&
              section.paragraphs.every(
                (paragraph) => paragraph.trim().length > 0,
              ),
          ),
        );
        assert.match(example.sections[1].code?.value ?? "", /dig example\.com/);
      }
    },
  );
});

test("production and disabled development never return cached preview examples", async () => {
  for (const environment of [
    { NODE_ENV: "production", CODING_PREVIEW: "1" },
    { NODE_ENV: "development", CODING_PREVIEW: "0" },
    { NODE_ENV: "test", CODING_PREVIEW: "1" },
  ]) {
    await inCodingEnvironment(environment, async () => {
      assert.deepEqual(await getCodingPosts(), []);
    });
  }
});

test("a single English initial narrows DNS examples while longer queries still search tags", async () => {
  await inCodingEnvironment(
    { NODE_ENV: "development", CODING_PREVIEW: "1" },
    async () => {
      const examples = await getCodingPosts();
      for (const query of ["u", "U"]) {
        assert.deepEqual(slugs(filterCodingPosts(examples, { query })), [
          "example-ubuntu-dns",
        ]);
      }
      assert.deepEqual(slugs(filterCodingPosts(examples, { query: "li" })), [
        "example-ubuntu-dns",
        "example-rocky-dns",
      ]);
    },
  );
});

test("single English initials match summary word prefixes, excluding midword and body matches", () => {
  const posts = [
    post("title-prefix", { title: "서버 / Ubuntu" }),
    post("description-prefix", { description: "도구: Utility 소개" }),
    post("tag-prefix", { tags: ["uTools"] }),
    post("midword", { title: "Linux", tags: ["Linux"] }),
    post("body-only", {
      sections: [
        { id: "intro", title: "Ubuntu", paragraphs: ["Utility 각 항목"] },
      ],
    }),
  ];
  assert.deepEqual(slugs(filterCodingPosts(posts, { query: "u" })), [
    "description-prefix",
    "tag-prefix",
    "title-prefix",
  ]);
  assert.deepEqual(slugs(filterCodingPosts(posts, { query: "각" })), [
    "body-only",
  ]);
  assert.deepEqual(slugs(filterCodingPosts(posts, { query: "utility" })), [
    "body-only",
    "description-prefix",
  ]);
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

test("tag filtering matches complete normalized tags rather than text or substrings", () => {
  const posts = [
    post("exact", { tags: ["DNS"] }),
    post("extended", { tags: ["DNSSEC"] }),
    post("title-only", { title: "DNS" }),
    post("korean", { tags: ["\u1100\u1161\u11a8"] }),
  ];
  assert.deepEqual(slugs(filterCodingPosts(posts, { tag: "  dNs  " })), [
    "exact",
  ]);
  assert.deepEqual(filterCodingPosts(posts, { tag: "DN" }), []);
  assert.deepEqual(slugs(filterCodingPosts(posts, { tag: "각" })), ["korean"]);
  assert.deepEqual(
    slugs(
      filterCodingPosts([post("composed", { tags: ["각"] })], {
        tag: " \u1100\u1161\u11a8 ",
      }),
    ),
    ["composed"],
  );
  assert.deepEqual(
    filterCodingPosts(posts, { tag: "   " }),
    filterCodingPosts(posts),
  );
});

test("category, search query, and tag filters must all match", () => {
  const posts = [
    post("match", { title: "Ubuntu 조회", tags: ["Linux", "DNS"] }),
    post("other-category", {
      title: "Ubuntu 조회",
      tags: ["DNS"],
      category: "network",
    }),
    post("other-query", { title: "Rocky 조회", tags: ["DNS"] }),
    post("other-tag", { title: "Ubuntu 조회", tags: ["Linux"] }),
  ];
  assert.deepEqual(
    slugs(
      filterCodingPosts(posts, {
        category: "infrastructure",
        query: "ubuntu",
        tag: "dns",
      }),
    ),
    ["match"],
  );
  assert.deepEqual(
    filterCodingPosts(posts, {
      category: "frontend",
      query: "ubuntu",
      tag: "dns",
    }),
    [],
  );
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

test("tag URLs retain category and search while normalizing and safely encoding the tag", () => {
  assert.equal(codingListHref({ tag: "   " }), "/coding");
  assert.equal(codingListHref({ tag: " DNS " }), "/coding?tag=DNS");

  const tag = "\u1100\u1161\u11a8 & q=changed # C++ /?";
  const url = new URL(
    codingListHref({
      category: "infrastructure",
      query: "Ubuntu DNS",
      tag: `  ${tag}  `,
    }),
    "https://example.test",
  );
  assert.equal(url.pathname, "/coding");
  assert.equal(url.searchParams.get("category"), "infrastructure");
  assert.equal(url.searchParams.get("q"), "Ubuntu DNS");
  assert.equal(url.searchParams.get("tag"), "각 & q=changed # C++ /?");
  assert.equal(url.searchParams.size, 3);
  assert.equal(url.hash, "");
});
