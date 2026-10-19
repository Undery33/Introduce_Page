import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  createDraft,
  saveDraft,
  publishDraft,
  unpublishDraft,
} from "../../src/lib/admin/posts";
import { parsePostInput } from "../../src/lib/admin/post-input";
import { getCodingPosts } from "../../src/lib/coding-store";
import { getDatabase } from "../../src/lib/db";

// An explicit, separate migrated test DB is mandatory. Never reset any database.
test("PostgreSQL draft isolation, publication, conflicts and unpublication", async () => {
  const url = process.env.ADMIN_TEST_DATABASE_URL;
  assert.ok(
    url,
    "Set ADMIN_TEST_DATABASE_URL to a dedicated migrated test database",
  );
  const parsed = new URL(url);
  assert.match(parsed.protocol, /^postgres(?:ql)?:$/);
  assert.match(
    parsed.pathname,
    /^\/[a-zA-Z0-9_]+_test$/,
    "Database name must end in _test",
  );
  assert.equal(
    parsed.searchParams.has("schema"),
    false,
    "Use a separate database, not a production schema",
  );
  process.env.DATABASE_URL = url;
  process.env.CODING_PREVIEW = "0";
  const db = getDatabase();
  const ids: string[] = [];
  const slug = `integration-${randomUUID()}`;
  const input = parsePostInput({
    slug,
    title: "공개 전 초안",
    description: "검증용",
    category: "backend",
    icon: "code",
    tags: ["검사"],
    sections: [{ id: "body", title: "본문", markdown: "최초 본문" }],
  });
  const publicPost = async () =>
    (await getCodingPosts()).find((post) => post.slug === slug);
  try {
    let draft = await createDraft(input);
    ids.push(draft.id);
    assert.equal(await publicPost(), undefined);
    draft = await publishDraft(draft.id, draft.version);
    assert.equal((await publicPost())?.title, input.title);
    const firstDate = (await publicPost())?.publishedAt;
    const previousVersion = draft.version;
    const changed = {
      ...input,
      title: "변경 초안",
      sections: [
        { id: "body", title: "본문", markdown: "아직 비공개인 변경 내용" },
      ],
    };
    draft = await saveDraft(draft.id, draft.version, changed);
    assert.equal((await publicPost())?.title, input.title);
    assert.doesNotMatch(
      JSON.stringify(await publicPost()),
      /아직 비공개인 변경 내용/,
    );
    await assert.rejects(saveDraft(draft.id, previousVersion, input), {
      status: 409,
    });
    await assert.rejects(
      saveDraft(draft.id, draft.version, {
        ...changed,
        slug: `${slug}-changed`,
      }),
      { status: 400 },
    );
    draft = await publishDraft(draft.id, draft.version);
    assert.equal((await publicPost())?.title, changed.title);
    assert.equal((await publicPost())?.publishedAt, firstDate);
    const visible = await publicPost();
    assert.ok(visible);
    for (const field of [
      "id",
      "postId",
      "version",
      "publishedVersion",
      "status",
      "draft",
    ])
      assert.equal(field in visible, false);

    const duplicate = await createDraft(input);
    ids.push(duplicate.id);
    await assert.rejects(publishDraft(duplicate.id, duplicate.version));
    assert.equal(
      (
        await db.codingPostDraft.findUniqueOrThrow({
          where: { id: duplicate.id },
        })
      ).version,
      duplicate.version,
    );
    assert.equal((await publicPost())?.title, changed.title);

    draft = await unpublishDraft(draft.id, draft.version);
    assert.equal(await publicPost(), undefined);
    assert.equal(draft.sections[0].markdown, changed.sections[0].markdown);
    await publishDraft(draft.id, draft.version);
    assert.equal((await publicPost())?.publishedAt, firstDate);
  } finally {
    // Delete only rows created by this invocation, preserving other test data.
    const drafts = await db.codingPostDraft.findMany({
      where: { id: { in: ids } },
      select: { postId: true },
    });
    const postIds = drafts.flatMap((draft) =>
      draft.postId ? [draft.postId] : [],
    );
    await db.$transaction([
      db.codingPostDraft.deleteMany({ where: { id: { in: ids } } }),
      db.codingPost.deleteMany({ where: { id: { in: postIds } } }),
    ]);
    await db.$disconnect();
  }
});
