import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MarkdownContent,
  safeContentUrl,
} from "../src/components/markdown-content";
test("Markdown never executes HTML, MDX or unsafe link/image protocols", () => {
  const html = renderToStaticMarkup(
    createElement(MarkdownContent, {
      source:
        "<script>alert(1)</script>\n\n[x](javascript:alert) ![x](data:text/html,bad)\n\n```html\n<img src=x onerror=alert(1)>\n```",
    }),
  );
  assert.doesNotMatch(html, /<script|onerror="|href="javascript:|src="data:/);
  assert.match(html, /&lt;script&gt;/);
  for (const url of [
    "javascript:alert(1)",
    "data:image/svg+xml,x",
    "//evil.example",
    "/\\evil.example",
    "https://user:secret@example.com",
    " https://example.com",
  ])
    assert.equal(safeContentUrl(url), null);
});
test("preview/public renderer supports code, lists, links, images and tables", () => {
  const html = renderToStaticMarkup(
    createElement(MarkdownContent, {
      source:
        "## 제목\n\n**강조** [공식](https://example.com)\n\n- 항목\n- 다음\n\n| 항목 | 값 |\n| --- | --- |\n| DNS | 53 |\n\n![설명](/images/test.png)\n\n```bash\necho test\n```",
    }),
  );
  for (const marker of [
    "<h3>",
    "<strong>",
    "<ul>",
    "<table>",
    "<pre",
    "<img",
    'href="https://example.com/"',
  ])
    assert.ok(html.includes(marker), marker);
});
