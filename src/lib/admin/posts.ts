import { CodingCategory, Prisma, type CodingPostDraft } from "@prisma/client";
import { getDatabase } from "@/lib/db";
import { AdminError } from "./http";
import {
  assertPublishable,
  parsePostInput,
  type EditorDocument,
  type PostInput,
} from "./post-input";

const categories = {
  frontend: CodingCategory.FRONTEND,
  backend: CodingCategory.BACKEND,
  infrastructure: CodingCategory.INFRASTRUCTURE,
  network: CodingCategory.NETWORK,
} as const;
export function publicCategory(
  category: CodingCategory,
): PostInput["category"] | null {
  return (
    (Object.keys(categories) as PostInput["category"][]).find(
      (key) => categories[key] === category,
    ) ?? null
  );
}
function dataFor(input: PostInput) {
  return {
    ...input,
    category: categories[input.category],
    sections: input.sections as Prisma.InputJsonValue,
  };
}
export function editorDocument(
  draft: CodingPostDraft & { post?: { status: string } | null },
): EditorDocument {
  const category = publicCategory(draft.category);
  if (!category)
    throw new AdminError(409, "기존 글의 분류를 먼저 이전해야 합니다.");
  const input = parsePostInput({
    slug: draft.slug,
    title: draft.title,
    description: draft.description,
    category,
    icon: draft.icon,
    tags: draft.tags,
    sections: draft.sections,
  });
  return {
    ...input,
    id: draft.id,
    version: draft.version,
    publishedVersion: draft.publishedVersion,
    postId: draft.postId,
    publicStatus: draft.post?.status ?? null,
    updatedAt: draft.updatedAt.toISOString(),
  };
}
export async function loadDraft(id: string) {
  const draft = await getDatabase().codingPostDraft.findUnique({
    where: { id },
    include: { post: { select: { status: true } } },
  });
  return draft ? editorDocument(draft) : null;
}
export async function createDraft(input: PostInput) {
  return editorDocument(
    await getDatabase().codingPostDraft.create({ data: dataFor(input) }),
  );
}
export async function saveDraft(id: string, version: number, input: PostInput) {
  return getDatabase().$transaction(async (db) => {
    const existing = await db.codingPostDraft.findUnique({
      where: { id },
      include: { post: { select: { slug: true } } },
    });
    if (!existing) throw new AdminError(404, "글을 찾을 수 없습니다.");
    if (existing.post && existing.post.slug !== input.slug)
      throw new AdminError(400, "한 번 발행한 글의 주소는 변경할 수 없습니다.");
    const changed = await db.codingPostDraft.updateMany({
      where: { id, version },
      data: { ...dataFor(input), version: { increment: 1 } },
    });
    if (changed.count !== 1)
      throw new AdminError(
        409,
        "다른 창에서 수정된 글입니다. 현재 내용을 복사한 뒤 새로고침하십시오.",
      );
    return editorDocument(
      await db.codingPostDraft.findUniqueOrThrow({
        where: { id },
        include: { post: { select: { status: true } } },
      }),
    );
  });
}
export async function publishDraft(id: string, version: number) {
  return getDatabase().$transaction(async (db) => {
    // A conditional update locks the draft and detects concurrent edits.
    const locked = await db.codingPostDraft.updateMany({
      where: { id, version },
      data: { version: { increment: 1 } },
    });
    if (locked.count !== 1)
      throw new AdminError(
        409,
        "글이 변경되었거나 없습니다. 새로고침 후 다시 확인하십시오.",
      );
    const draft = await db.codingPostDraft.findUniqueOrThrow({
      where: { id },
      include: { post: { select: { slug: true, publishedAt: true } } },
    });
    const input = parsePostInput({
      ...draft,
      category: publicCategory(draft.category),
    });
    assertPublishable(input);
    if (draft.post && draft.post.slug !== input.slug)
      throw new AdminError(409, "발행한 글의 주소가 일치하지 않습니다.");
    const publicData = {
      ...dataFor(input),
      markdown: input.sections
        .map((section) => `## ${section.title}\n\n${section.markdown}`)
        .join("\n\n"),
      status: "PUBLISHED" as const,
      publishedAt: draft.post?.publishedAt ?? new Date(),
    };
    const post = draft.postId
      ? await db.codingPost.update({
          where: { id: draft.postId },
          data: publicData,
        })
      : await db.codingPost.create({ data: publicData });
    const saved = await db.codingPostDraft.update({
      where: { id },
      data: { postId: post.id, publishedVersion: draft.version },
      include: { post: { select: { status: true } } },
    });
    return editorDocument(saved);
  });
}
export async function unpublishDraft(id: string, version: number) {
  return getDatabase().$transaction(async (db) => {
    const changed = await db.codingPostDraft.updateMany({
      where: { id, version },
      data: { version: { increment: 1 }, publishedVersion: null },
    });
    if (changed.count !== 1)
      throw new AdminError(
        409,
        "글이 변경되었거나 없습니다. 새로고침 후 다시 확인하십시오.",
      );
    const draft = await db.codingPostDraft.findUniqueOrThrow({ where: { id } });
    if (draft.postId)
      await db.codingPost.update({
        where: { id: draft.postId },
        data: { status: "ARCHIVED" },
      });
    return editorDocument(
      await db.codingPostDraft.findUniqueOrThrow({
        where: { id },
        include: { post: { select: { status: true } } },
      }),
    );
  });
}
