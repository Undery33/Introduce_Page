import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CodingPost } from "../src/lib/coding";

test("actual article renders only the selected chapter and links first/middle/last correctly", async () => {
  // Node has no CSS Modules loader; only styles are substituted, not the UI.
  const hook = registerHooks({
    load(url, context, next) {
      if (url.endsWith(".module.css"))
        return {
          format: "commonjs",
          source: "module.exports = {};",
          shortCircuit: true,
        };
      return next(url, context);
    },
  });
  try {
    const { CodingArticle } = await import("../src/app/coding/coding-article");
    const post: CodingPost = {
      slug: "chapter-check",
      title: "챕터 검사",
      description: "",
      category: "backend",
      icon: "code",
      tags: [],
      publishedAt: "2026-10-19T00:00:00Z",
      updatedAt: "2026-10-19T00:00:00Z",
      sections: ["one", "two", "three"].map((id) => ({
        id,
        title: id,
        paragraphs: [],
        markdown: `BODY_${id}`,
      })),
    };
    for (let i = 0; i < post.sections.length; i++) {
      const section = post.sections[i];
      const html = renderToStaticMarkup(
        createElement(CodingArticle, { post, sectionId: section.id }),
      );
      assert.match(html, new RegExp(`BODY_${section.id}`));
      for (const other of post.sections.filter((item) => item !== section))
        assert.ok(!html.includes(`BODY_${other.id}`));
      const nav =
        html.match(
          /<nav[^>]*aria-label="글 목차 이동"[^>]*>([\s\S]*?)<\/nav>/,
        )?.[1] ?? "";
      assert.equal(nav.includes("이전"), i > 0);
      assert.equal(nav.includes("다음"), i < 2);
      if (i > 0)
        assert.ok(
          nav.includes(
            `/coding/chapter-check?section=${post.sections[i - 1].id}`,
          ),
        );
      if (i < 2)
        assert.ok(
          nav.includes(
            `/coding/chapter-check?section=${post.sections[i + 1].id}`,
          ),
        );
    }
    const fallback = renderToStaticMarkup(
      createElement(CodingArticle, { post, sectionId: "missing" }),
    );
    assert.match(fallback, /BODY_one/);
  } finally {
    hook.deregister();
  }
});
